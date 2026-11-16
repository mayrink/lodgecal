import { requireUser } from '$lib/server/auth.js';
import { dashboardData } from '$lib/server/upcoming.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	const upcomingWeeks = locals.lodge?.upcomingWeeks ?? 4;
	const dash = dashboardData(locals.db, {
		upcomingWeeks,
		terminology: locals.lodge?.terminology ?? {},
		isAdmin: user.role === 'ADMIN',
		viewerPersonId: user.personId
	});
	return {
		...dash,
		isAdmin: user.role === 'ADMIN',
		upcomingWeeks
	};
}
