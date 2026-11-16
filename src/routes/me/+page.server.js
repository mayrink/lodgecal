import { fail, redirect } from '@sveltejs/kit';
import { PERSON_STATUS, RELATIONSHIPS } from '$lib/constants.js';
import { plainDate } from '$lib/dates.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { correctKnowledge, getKnowledgeById, insertKnowledge, retireKnowledge } from '$lib/server/repos/knowledge.js';
import {
	addHouseholdMember,
	getPersonById,
	insertPerson,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	redirect(303, `/family#person-${user.personId}`);
}

/** @type {import('./$types').Actions} */
export const actions = {
	addMember: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const relationship = asString(form.get('relationship')).toUpperCase();
		if (relationship !== RELATIONSHIPS.SPOUSE && relationship !== RELATIONSHIPS.CHILD) {
			return fail(400, { error: 'Relationship must be spouse or child.' });
		}
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: PERSON_STATUS.ACTIVE
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const personId = insertPerson(locals.db, parsed.value);
		const attached = addHouseholdMember(locals.db, user.id, personId, relationship);
		if (!attached.ok) return fail(400, { error: attached.error });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'household_member_create',
			entityType: 'person',
			entityId: personId,
			summary: `Added ${relationship.toLowerCase()} ${parsed.value.fullName}`
		});
		return { saved: true };
	},

	save: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const before = getPersonById(locals.db, user.personId);
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email') || before.email,
			phone: form.get('phone'),
			status: before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!parsed.value.email) return fail(400, { error: 'Email is required for a User account.' });
		updatePerson(locals.db, user.personId, { ...parsed.value, status: before.status });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: parsed.value.email,
			action: 'person_update_self',
			entityType: 'person',
			entityId: user.personId,
			summary: summarizeChange(before, parsed.value)
		});
		return { saved: true };
	},

	knowledge: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate'));
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		try { plainDate(effectiveDate); } catch { return fail(400, { error: 'A valid date is required.' }); }
		const id = insertKnowledge(locals.db, {
			personId: user.personId,
			body,
			effectiveDate,
			authorUserId: user.id
		});
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_create',
			entityType: 'knowledge',
			entityId: id,
			summary: 'Added knowledge entry for self'
		});
		return { saved: true };
	},

	editKnowledge: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('knowledgeId')));
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate'));
		const entry = getKnowledgeById(locals.db, id);
		if (!entry || entry.person_id !== user.personId) return fail(404, { error: 'Knowledge entry not found.' });
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		try { plainDate(effectiveDate); } catch { return fail(400, { error: 'A valid date is required.' }); }
		correctKnowledge(locals.db, id, body, effectiveDate);
		return { saved: true };
	},

	deleteKnowledge: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('knowledgeId')));
		const entry = getKnowledgeById(locals.db, id);
		if (!entry || entry.person_id !== user.personId) return fail(404, { error: 'Knowledge entry not found.' });
		retireKnowledge(locals.db, id);
		return { saved: true };
	}
};
