import { fail, redirect } from '@sveltejs/kit';
import { login } from '$lib/server/auth.js';
import { asString } from '$lib/server/validation.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (locals.user) {
		if (locals.user.mustChangePassword) redirect(303, '/change-password');
		redirect(303, '/');
	}
	return { csrf: locals.csrf, lodge: locals.lodge };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const csrf = asString(form.get('csrf'));
		if (csrf !== locals.csrf) {
			return fail(403, { error: 'Invalid CSRF token.' });
		}

		const email = asString(form.get('email'));
		const password = asString(form.get('password'));
		const result = await login(locals.db, cookies, email, password);
		if (!result.ok) {
			return fail(400, { error: result.error });
		}
		if (result.mustChangePassword) {
			redirect(303, '/change-password');
		}
		redirect(303, '/');
	}
};
