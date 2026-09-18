import { fail } from '@sveltejs/kit';
import { PERSON_STATUS, RELATIONSHIPS } from '$lib/constants.js';
import { recordAudit } from '$lib/server/audit.js';
import { requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import {
	addHouseholdMember,
	getHousehold,
	getPersonById,
	insertPerson,
	personHasUserAccount,
	updatePerson
} from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

function shapeHousehold(household) {
	if (!household) return null;
	const mark = (person) => (person ? { ...person, hasAccount: Boolean(person.has_account) } : null);
	return {
		spouse: mark(household.spouse),
		children: (household.children ?? []).map(mark)
	};
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	return {
		csrf: locals.csrf,
		household: shapeHousehold(getHousehold(locals.db, user.id))
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
		const household = getHousehold(locals.db, user.id);
		const belongs =
			household?.spouse?.id === personId || (household?.children ?? []).some((c) => c.id === personId);
		if (!belongs) {
			return fail(403, { error: 'You may only edit your own household members.' });
		}
		if (personHasUserAccount(locals.db, personId)) {
			return fail(403, { error: 'That person is a Lodge member and manages their own account.' });
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
	}
};
