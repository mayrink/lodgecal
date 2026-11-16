import { formatDayMonthLong } from '$lib/dates.js';
import { honorificName } from '$lib/display.js';
import { requireUser } from '$lib/server/auth.js';
import { listBrothersDirectory } from '$lib/server/repos/people.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireUser(locals);
	const isAdmin = user.role === 'ADMIN';
	const terminology = locals.lodge?.terminology ?? {};
	const raw = listBrothersDirectory(locals.db, { includeInactive: isAdmin });

	const brothers = raw.map((row) => ({
		id: row.person_id,
		userId: row.user_id,
		name: honorificName(row, terminology),
		fullName: row.full_name,
		birthday: formatDayMonthLong(row.birth_date),
		phone: row.phone || '',
		email: row.email || '',
		you: row.person_id === user.personId,
		sleeping: isAdmin ? row.status !== 'ACTIVE' : false,
		statusLabel:
			isAdmin && row.status !== 'ACTIVE'
				? row.status === 'DEPARTED'
					? 'Departed'
					: 'Sleeping'
				: null
	}));

	return {
		isAdmin,
		brothers
	};
}
