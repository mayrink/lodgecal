import { fail, redirect } from '@sveltejs/kit';
import { logout } from '$lib/server/auth.js';
import { asString } from '$lib/server/validation.js';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		if (asString(form.get('csrf')) !== locals.csrf) {
			return fail(403, { error: 'Invalid CSRF token.' });
		}
		logout(locals.db, cookies);
		redirect(303, '/login');
	}
};
