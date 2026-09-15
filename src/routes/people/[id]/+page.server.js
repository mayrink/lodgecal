import { error, fail } from '@sveltejs/kit';
import { RELATIONSHIPS } from '$lib/constants.js';
import { ageOn } from '$lib/dates.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { insertKnowledge, listKnowledge, retireKnowledge } from '$lib/server/repos/knowledge.js';
import {
	addHouseholdMember,
	endHouseholdMembership,
	getHousehold,
	getPersonById,
	listHouseholdHeads,
	setPersonStatus,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, params }) {
	requireAdmin(locals);
	const person = getPersonById(locals.db, Number(params.id));
	if (!person) error(404, 'Person not found.');
	const userRow = locals.db.prepare('SELECT * FROM users WHERE person_id = ?').get(person.id);
	const household = userRow ? getHousehold(locals.db, userRow.id) : null;
	return {
		csrf: locals.csrf,
		person,
		age: ageOn(person.birth_date),
		userRow,
		household,
		knowledge: listKnowledge(locals.db, person.id, { includeRetired: true }),
		heads: listHouseholdHeads(locals.db)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	save: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(params.id);
		const before = getPersonById(locals.db, id);
		if (!before) error(404, 'Person not found.');
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: form.get('status') || before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		updatePerson(locals.db, id, parsed.value);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'person_update',
			entityType: 'person',
			entityId: id,
			summary: summarizeChange(before, parsed.value)
		});
		return { saved: true };
	},

	status: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const status = asString(form.get('status')).toUpperCase();
		const id = Number(params.id);
		const before = getPersonById(locals.db, id);
		if (!before) error(404, 'Person not found.');
		setPersonStatus(locals.db, id, status);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'person_status',
			entityType: 'person',
			entityId: id,
			summary: `status: ${before.status} -> ${status}`
		});
		return { saved: true };
	},

	endRelationship: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const membershipId = Number(asString(form.get('membershipId')));
		if (!membershipId) return fail(400, { error: 'Missing membership.' });
		endHouseholdMembership(locals.db, membershipId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'relationship_end',
			entityType: 'household_membership',
			entityId: membershipId,
			summary: 'Ended household relationship'
		});
		return { saved: true };
	},

	attach: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('householdUserId')));
		const relationship = asString(form.get('relationship')).toUpperCase();
		if (!userId || (relationship !== RELATIONSHIPS.SPOUSE && relationship !== RELATIONSHIPS.CHILD)) {
			return fail(400, { error: 'Household and relationship are required.' });
		}
		const result = addHouseholdMember(locals.db, userId, Number(params.id), relationship);
		if (!result.ok) return fail(400, { error: result.error });
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'relationship_add',
			entityType: 'household_membership',
			entityId: params.id,
			summary: `Attached as ${relationship} to user ${userId}`
		});
		return { saved: true };
	},

	addKnowledge: async ({ request, locals, params }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const body = asString(form.get('body'));
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		const id = insertKnowledge(locals.db, {
			personId: Number(params.id),
			body,
			authorUserId: admin.id
		});
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_create',
			entityType: 'knowledge',
			entityId: id,
			summary: `Admin added knowledge for person ${params.id}`
		});
		return { saved: true };
	},

	retireKnowledge: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const id = Number(asString(form.get('knowledgeId')));
		retireKnowledge(locals.db, id);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_retire',
			entityType: 'knowledge',
			entityId: id,
			summary: 'Retired knowledge entry'
		});
		return { saved: true };
	}
};
