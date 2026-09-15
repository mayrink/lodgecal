import { requireUser } from '$lib/server/auth.js';
import { dashboardData } from '$lib/server/upcoming.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	const dash = dashboardData(locals.db, {
		upcomingWeeks: locals.lodge?.upcomingWeeks ?? 4,
		terminology: locals.lodge?.terminology ?? {},
		isAdmin: user.role === 'ADMIN'
	});
	return {
		...dash,
		isAdmin: user.role === 'ADMIN',
		upcomingWeeks: locals.lodge?.upcomingWeeks ?? 4
	};
}
