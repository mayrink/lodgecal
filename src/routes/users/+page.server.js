import { fail } from '@sveltejs/kit';
import { PERSON_STATUS, ROLES } from '$lib/constants.js';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { generateTemporaryPassword, hashPassword } from '$lib/server/passwords.js';
import { getPersonByEmail, insertPerson, setPersonStatus, updatePerson } from '$lib/server/repos/people.js';
import {
	getUserById,
	insertUser,
	listUsers,
	restoreDeletedUser,
	softDeleteUser,
	setTemporaryPassword,
	setUserRole
} from '$lib/server/repos/users.js';
import { deleteUserSessions } from '$lib/server/sessions.js';
import { asString, isValidEmail, isValidRole, normalizeEmail, validatePersonInput } from '$lib/server/validation.js';

function readPersonInput(form, status = PERSON_STATUS.ACTIVE) {
	return validatePersonInput({
		fullName: form.get('fullName'),
		gender: form.get('gender'),
		birthDate: form.get('birthDate'),
		email: form.get('email'),
		phone: form.get('phone'),
		status
	});
}

function validateAccountEmail(parsed) {
	if (!parsed.ok) return parsed;
	if (!parsed.value.email || !isValidEmail(parsed.value.email)) {
		return { ok: false, error: 'A User account requires a valid email login.' };
	}
	parsed.value.email = normalizeEmail(parsed.value.email);
	return parsed;
}

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	return { csrf: locals.csrf, users: listUsers(locals.db), generatedPassword: null };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const role = asString(form.get('role')).toUpperCase() || ROLES.USER;
		if (!isValidRole(role)) return fail(400, { error: 'Invalid role.' });
		const parsed = validateAccountEmail(readPersonInput(form));
		if (!parsed.ok) return fail(400, { error: parsed.error });
		const existing = locals.db
			.prepare(
				`SELECT p.id AS person_id, u.id AS user_id, u.deleted_at
				 FROM people p
				 LEFT JOIN users u ON u.person_id = p.id
				 WHERE p.email = ?`
			)
			.get(parsed.value.email);
		if (existing?.user_id && !existing.deleted_at) {
			return fail(400, { error: 'An account with that email already exists.' });
		}

		const temp = generateTemporaryPassword();
		const passwordHash = await hashPassword(temp);
		const createAccount = locals.db.transaction(() => {
			const personId = existing?.person_id ?? insertPerson(locals.db, parsed.value);
			if (existing?.person_id) updatePerson(locals.db, personId, parsed.value);
			if (existing?.user_id) {
				restoreDeletedUser(locals.db, existing.user_id, { passwordHash, role });
				return { userId: existing.user_id, restored: true };
			}
			const userId = insertUser(locals.db, {
				personId,
				passwordHash,
				role,
				mustChangePassword: true
			});
			return { personId, userId };
		});
		const { userId, restored } = createAccount();
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: restored ? 'user_restore' : 'user_create',
			entityType: 'user',
			entityId: userId,
			summary: `${restored ? 'Restored' : 'Created'} ${role} account for ${parsed.value.email}`
		});
		return { generatedPassword: temp, newUserEmail: parsed.value.email };
	},

	update: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'User not found.' });
		const role = asString(form.get('role')).toUpperCase();
		if (!isValidRole(role)) return fail(400, { error: 'Invalid role.' });
		const parsed = validateAccountEmail(
			readPersonInput(form, asString(form.get('status')) || user.person_status)
		);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (user.id === admin.id && (role !== ROLES.ADMIN || parsed.value.status !== PERSON_STATUS.ACTIVE)) {
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

	resetPassword: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'User not found.' });
		const temp = generateTemporaryPassword();
		const passwordHash = await hashPassword(temp);
		setTemporaryPassword(locals.db, userId, passwordHash);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_password_reset',
			entityType: 'user',
			entityId: userId,
			summary: `Temporary password issued for ${user.email}`
		});
		return { generatedPassword: temp, newUserEmail: user.email };
	},

	archive: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'User not found.' });
		if (user.id === admin.id) return fail(400, { error: 'You cannot archive your own account.' });
		setPersonStatus(locals.db, user.person_id, PERSON_STATUS.INACTIVE);
		deleteUserSessions(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_archive',
			entityType: 'user',
			entityId: userId,
			summary: `Archived account for ${user.email}`
		});
		return { saved: true };
	},

	reactivate: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'User not found.' });
		setPersonStatus(locals.db, user.person_id, PERSON_STATUS.ACTIVE);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_reactivate',
			entityType: 'user',
			entityId: userId,
			summary: `Reactivated account for ${user.email}`
		});
		return { saved: true };
	},

	delete: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const user = getUserById(locals.db, userId);
		if (!user) return fail(404, { error: 'User not found.' });
		if (user.id === admin.id) return fail(400, { error: 'You cannot delete your own account.' });
		softDeleteUser(locals.db, userId);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_delete',
			entityType: 'user',
			entityId: userId,
			summary: `Deleted login account for ${user.email}`
		});
		return { saved: true };
	},

	role: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const csrf = csrfError(form, locals);
		if (csrf) return fail(403, { error: csrf });
		const userId = Number(asString(form.get('userId')));
		const role = asString(form.get('role')).toUpperCase();
		if (!isValidRole(role)) return fail(400, { error: 'Invalid role.' });
		if (userId === admin.id && role !== ROLES.ADMIN) {
			return fail(400, { error: 'You cannot remove your own administrator role.' });
		}
		setUserRole(locals.db, userId, role);
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_role',
			entityType: 'user',
			entityId: userId,
			summary: `Role set to ${role}`
		});
		return { saved: true };
	}
};
