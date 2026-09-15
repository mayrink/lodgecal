import { fail, redirect } from '@sveltejs/kit';
import { PERSON_STATUS, RELATIONSHIPS } from '$lib/constants.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { addHouseholdMember, insertPerson, listHouseholdHeads } from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	return { csrf: locals.csrf, heads: listHouseholdHeads(locals.db) };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });

		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: PERSON_STATUS.ACTIVE
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });

		const id = insertPerson(locals.db, parsed.value);
		const attachUserId = Number(asString(form.get('householdUserId')));
		const relationship = asString(form.get('relationship')).toUpperCase();
		if (attachUserId && (relationship === RELATIONSHIPS.SPOUSE || relationship === RELATIONSHIPS.CHILD)) {
			const attached = addHouseholdMember(locals.db, attachUserId, id, relationship);
			if (!attached.ok) return fail(400, { error: attached.error, id });
		}
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'person_create',
			entityType: 'person',
			entityId: id,
			summary: summarizeChange({}, parsed.value)
		});
		redirect(303, `/people/${id}`);
	}
};
