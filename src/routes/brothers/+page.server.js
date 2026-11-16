import { fail } from '@sveltejs/kit';
import { PERSON_STATUS, ROLES } from '$lib/constants.js';
import { formatDayMonthLong } from '$lib/dates.js';
import { honorificName } from '$lib/display.js';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin, requireUser } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import {
	getPersonByEmail,
	listBrothersDirectory,
	setPersonStatus,
	updatePerson
} from '$lib/server/repos/people.js';
import {
	getUserById,
	purgeBrotherAndFamily,
	setUserRole
} from '$lib/server/repos/users.js';
import { deleteUserSessions } from '$lib/server/sessions.js';
import {
	asString,
	isValidEmail,
	isValidRole,
	normalizeEmail,
	validatePersonInput
} from '$lib/server/validation.js';

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
		gender: row.gender,
		birthDate: row.birth_date,
		birthMonthDay: (row.birth_date || '').slice(5),
		birthday: formatDayMonthLong(row.birth_date),
		phone: row.phone || '',
		email: row.email || '',
		role: isAdmin ? row.role : undefined,
		status: isAdmin ? row.status : 'ACTIVE',
		familyCount: isAdmin ? Number(row.family_count ?? 0) : 0,
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
		csrf: locals.csrf,
		isAdmin,
		brothers
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	updateBrother: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		const role = asString(form.get('role')).toUpperCase() || user.role;
		if (!isValidRole(role)) return fail(400, { error: 'Invalid role.' });

		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender') || 'MALE',
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: asString(form.get('status')) || user.person_status
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!parsed.value.email || !isValidEmail(parsed.value.email)) {
			return fail(400, { error: 'A valid email login is required.' });
		}
		parsed.value.email = normalizeEmail(parsed.value.email);

		if (
			user.id === admin.id &&
			(role !== ROLES.ADMIN || parsed.value.status !== PERSON_STATUS.ACTIVE)
		) {
			return fail(400, { error: 'You cannot remove your own administrator access.' });
		}
		const duplicate = getPersonByEmail(locals.db, parsed.value.email);
		if (duplicate && duplicate.id !== user.person_id) {
			return fail(400, { error: 'Another person already uses that email address.' });
		}

		const save = locals.db.transaction(() => {
			updatePerson(locals.db, user.person_id, parsed.value);
			setUserRole(locals.db, userId, role);
		});
		save();
		if (parsed.value.status !== PERSON_STATUS.ACTIVE) deleteUserSessions(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_update',
			entityType: 'user',
			entityId: userId,
			summary: `Updated account for ${parsed.value.email}`
		});
		return { saved: true };
	},

	toggleSleep: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		if (user.id === admin.id && user.person_status === PERSON_STATUS.ACTIVE) {
			return fail(400, { error: 'You cannot mark your own account as sleeping.' });
		}
		const nextStatus =
			user.person_status === PERSON_STATUS.ACTIVE
				? PERSON_STATUS.INACTIVE
				: PERSON_STATUS.ACTIVE;
		setPersonStatus(locals.db, user.person_id, nextStatus);
		if (nextStatus !== PERSON_STATUS.ACTIVE) deleteUserSessions(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: nextStatus === PERSON_STATUS.ACTIVE ? 'user_reactivate' : 'user_archive',
			entityType: 'user',
			entityId: userId,
			summary: `Set ${user.email} status to ${nextStatus}`
		});
		return { saved: true };
	},

	deleteBrother: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const typedName = asString(form.get('confirmName'));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'Brother not found.' });
		if (user.id === admin.id) {
			return fail(400, { error: 'You cannot delete your own account.' });
		}
		const terminology = locals.lodge?.terminology ?? {};
		const expectedDisplay = honorificName(user, terminology);
		if (typedName !== expectedDisplay && typedName !== user.full_name) {
			return fail(400, { error: 'Typed name did not match the brother’s name.' });
		}
		const result = purgeBrotherAndFamily(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_purge',
			entityType: 'user',
			entityId: userId,
			summary: `Purged ${user.full_name} (${user.email}) and household (${result?.deletedPeopleCount ?? 1} records)`
		});
		return { saved: true };
	}
};
