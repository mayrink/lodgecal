import { fail, redirect } from '@sveltejs/kit';
import { recordAudit } from '$lib/server/audit.js';
import { requireAuthenticated } from '$lib/server/auth.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '$lib/server/passwords.js';
import { getUserById, setPassword } from '$lib/server/repos/users.js';
import { asString } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	const user = requireAuthenticated(locals);
	return {
		csrf: locals.csrf,
		forced: user.mustChangePassword,
		lodge: locals.lodge
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const user = requireAuthenticated(locals);
		const form = await request.formData();
		const csrf = asString(form.get('csrf'));
		if (csrf !== locals.csrf) {
			return fail(403, { error: 'Invalid CSRF token.' });
		}

		const current = asString(form.get('currentPassword'));
		const next = asString(form.get('newPassword'));
		const confirm = asString(form.get('newPasswordConfirm'));

		const row = getUserById(locals.db, user.id);
		if (!row) return fail(400, { error: 'Account not found.' });

		const currentOk = await verifyPassword(row.password_hash, current);
		if (!currentOk) return fail(400, { error: 'Current password is incorrect.' });

		const pwError = validatePasswordStrength(next);
		if (pwError) return fail(400, { error: pwError });
		if (next !== confirm) return fail(400, { error: 'Passwords do not match.' });
		if (current === next) {
			return fail(400, { error: 'New password must be different from the current password.' });
		}

		const hash = await hashPassword(next);
		setPassword(locals.db, user.id, hash);
		recordAudit(locals.db, {
			actorUserId: user.id,
			actorEmail: locals.person?.email,
			action: 'password_changed',
			entityType: 'user',
			entityId: user.id,
			summary: 'Password changed'
		});
		redirect(303, '/');
	}
};
