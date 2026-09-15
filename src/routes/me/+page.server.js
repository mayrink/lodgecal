import { fail } from '@sveltejs/kit';
import { ageOn } from '$lib/dates.js';
import { recordAudit, summarizeChange } from '$lib/server/audit.js';
import { requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { insertKnowledge, listKnowledge } from '$lib/server/repos/knowledge.js';
import { getPersonById, updatePerson } from '$lib/server/repos/people.js';
import { asString, validatePersonInput } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	const person = getPersonById(locals.db, user.personId);
	return {
		csrf: locals.csrf,
		person,
		isAdmin: user.role === 'ADMIN',
		age: user.role === 'ADMIN' ? ageOn(person.birth_date) : null,
		knowledge: listKnowledge(locals.db, person.id)
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
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
		if (!body) return fail(400, { error: 'Knowledge text is required.' });
		const id = insertKnowledge(locals.db, {
			personId: user.personId,
			body,
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
	}
};
