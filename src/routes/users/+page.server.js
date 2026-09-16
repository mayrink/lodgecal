import { fail } from '@sveltejs/kit';
import { PERSON_STATUS, ROLES } from '$lib/constants.js';
import { recordAudit } from '$lib/server/audit.js';
import { requireAdmin } from '$lib/server/auth.js';
import { csrfError } from '$lib/server/forms.js';
import { generateTemporaryPassword, hashPassword } from '$lib/server/passwords.js';
import { insertPerson, updatePerson } from '$lib/server/repos/people.js';
import {
	getUserById,
	insertUser,
	listUsers,
	setTemporaryPassword,
	setUserRole
} from '$lib/server/repos/users.js';
import { asString, isValidEmail, isValidRole, normalizeEmail, validatePersonInput } from '$lib/server/validation.js';

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
		const parsed = validatePersonInput({
			fullName: form.get('fullName'),
			gender: form.get('gender'),
			birthDate: form.get('birthDate'),
			email: form.get('email'),
			phone: form.get('phone'),
			status: PERSON_STATUS.ACTIVE
		});
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if (!parsed.value.email || !isValidEmail(parsed.value.email)) {
			return fail(400, { error: 'A User account requires a valid email login.' });
		}
		parsed.value.email = normalizeEmail(parsed.value.email);
		const existing = locals.db
			.prepare(
				`SELECT p.id AS person_id, u.id AS user_id
				 FROM people p
				 LEFT JOIN users u ON u.person_id = p.id
				 WHERE p.email = ?`
			)
			.get(parsed.value.email);
		if (existing?.user_id) return fail(400, { error: 'An account with that email already exists.' });

		const temp = generateTemporaryPassword();
		const passwordHash = await hashPassword(temp);
		const createAccount = locals.db.transaction(() => {
			const personId = existing?.person_id ?? insertPerson(locals.db, parsed.value);
			if (existing?.person_id) updatePerson(locals.db, personId, parsed.value);
			const userId = insertUser(locals.db, {
				personId,
				passwordHash,
				role,
				mustChangePassword: true
			});
			return { personId, userId };
		});
		const { userId } = createAccount();
		recordAudit(locals.db, {
			actorUserId: admin.id,
			actorEmail: locals.person?.email,
			action: 'user_create',
			entityType: 'user',
			entityId: userId,
			summary: `Created ${role} account for ${parsed.value.email}`
		});
		return { generatedPassword: temp, newUserEmail: parsed.value.email };
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
