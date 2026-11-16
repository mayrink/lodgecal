import { redirect } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/auth.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	requireAdmin(locals);
	redirect(303, '/admin?tab=members');
}
