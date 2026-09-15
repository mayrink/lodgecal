import { requireAdmin } from '$lib/server/auth.js';
import { listPeople } from '$lib/server/repos/people.js';
import { ageOn } from '$lib/dates.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	const people = listPeople(locals.db, { includeInactive: true }).map((p) => ({
		...p,
		age: ageOn(p.birth_date)
	}));
	return { people };
}
