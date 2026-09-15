import { fail } from '@sveltejs/kit';
import { PERSON_STATUS, RELATIONSHIPS } from '$lib/constants.js';
import { recordAudit } from '$lib/server/audit.js';
import { requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { insertKnowledge, listKnowledge } from '$lib/server/repos/knowledge.js';
import {
	addHouseholdMember,
	canAccessPerson,
	getHousehold,
	getPersonById,
	insertPerson,
	personHasUserAccount,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

function withKnowledge(db, household) {
	if (!household) return household;
	const attach = (person) =>
		person ? { ...person, knowledge: listKnowledge(db, person.id) } : person;
	const spouse = household.spouse && !personHasUserAccount(db, household.spouse.id)
		? attach(household.spouse)
		: null;
	const children = household.children
		.filter((child) => !personHasUserAccount(db, child.id))
		.map(attach);
	return { ...household, spouse, children };
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	return {
		csrf: locals.csrf,
		household: withKnowledge(locals.db, getHousehold(locals.db, user.id)),
		isAdmin: user.role === 'ADMIN'
	};
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

	saveMember: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(asString(form.get('personId')));
		if (!canAccessPerson(locals.db, user, personId) || personId === user.personId) {
			return fail(403, { error: 'You may only edit your own household members.' });
		}
		if (personHasUserAccount(locals.db, personId)) {
			return fail(403, { error: 'That person is a Lodge member and is not shown as a dependent.' });
		}
		const before = getPersonById(locals.db, personId);
		if (!before) return fail(404, { error: 'Person not found.' });
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: before.status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		updatePerson(locals.db, personId, { ...parsed.value, status: before.status });
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'person_update_household',
			entityType: 'person',
			entityId: personId,
			summary: `Updated household member ${parsed.value.fullName}`
		});
		return { saved: true };
	},

	knowledge: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const personId = Number(asString(form.get('personId')));
		const body = asString(form.get('body'));
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		if (!canAccessPerson(locals.db, user, personId)) {
			return fail(403, { error: 'You may only add knowledge for your own household.' });
		}
		const id = insertKnowledge(locals.db, {
			personId,
			body,
			authorUserId: user.id
		});
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'knowledge_create',
			entityType: 'knowledge',
			entityId: id,
			summary: `Added knowledge for person ${personId}`
		});
		return { saved: true };
	}
};
