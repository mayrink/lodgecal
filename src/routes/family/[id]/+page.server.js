import { error, fail, redirect } from '@sveltejs/kit';
import { plainDate } from '$lib/dates.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import {
	correctKnowledge,
	getKnowledgeById,
	insertKnowledge,
	retireKnowledge
} from '$lib/server/repos/knowledge.js';
import {
	canAccessPerson,
	getPersonById,
	personHasUserAccount,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

/**
 * A dependent's own page is reachable by anyone in their household (self-service),
 * but never for a person who has their own Lodge login — they manage themselves.
 */
function assertAccess(locals, params) {
	const user = requireUser(locals);
	const id = Number(params.id);
	if (!canAccessPerson(locals.db, user, id) || personHasUserAccount(locals.db, id)) {
		error(403, 'You may only view your own family members.');
	}
	return { user, id };
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, params }) {
	const { id } = assertAccess(locals, params);
	const person = getPersonById(locals.db, id);
	if (!person) error(404, 'Person not found.');
	redirect(303, `/family#person-${id}`);
}

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ request, locals, params }) => {
		const { user, id } = assertAccess(locals, params);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const before = getPersonById(locals.db, id);
		if (!before) error(404, 'Person not found.');
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		updatePerson(locals.db, id, { ...parsed.value, status: before.status });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'person_update_household',
			entityType: 'person',
			entityId: id,
			summary: summarizeChange(before, parsed.value)
		});
		return { saved: true };
	},

	addKnowledge: async ({ request, locals, params }) => {
		const { user, id } = assertAccess(locals, params);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate'));
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		const entryId = insertKnowledge(locals.db, {
			personId: id,
			body,
			effectiveDate,
			authorUserId: user.id
		});
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_create',
			entityType: 'knowledge',
			entityId: entryId,
			summary: `Added knowledge for household member ${id}`
		});
		return { saved: true };
	},

	editKnowledge: async ({ request, locals, params }) => {
		const { id } = assertAccess(locals, params);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const knowledgeId = Number(asString(form.get('knowledgeId')));
		const body = asString(form.get('body'));
		const effectiveDate = asString(form.get('effectiveDate'));
		const entry = getKnowledgeById(locals.db, knowledgeId);
		if (!entry || entry.person_id !== id) return fail(404, { error: 'Knowledge entry not found.' });
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		try {
			plainDate(effectiveDate);
		} catch {
			return fail(400, { error: 'A valid date is required.' });
		}
		correctKnowledge(locals.db, knowledgeId, body, effectiveDate);
		return { saved: true };
	},

	retireKnowledge: async ({ request, locals, params }) => {
		const { id } = assertAccess(locals, params);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const knowledgeId = Number(asString(form.get('knowledgeId')));
		const entry = getKnowledgeById(locals.db, knowledgeId);
		if (!entry || entry.person_id !== id) return fail(404, { error: 'Knowledge entry not found.' });
		retireKnowledge(locals.db, knowledgeId);
		return { saved: true };
	}
};
