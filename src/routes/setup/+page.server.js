import { fail, redirect } from '@sveltejs/kit';
import { GENDERS, PERSON_STATUS, ROLES } from '$lib/constants.js';
import { recordAudit } from '$lib/server/audit.js';
import { transaction } from '$lib/server/db.js';
import { hashPassword, validatePasswordStrength } from '$lib/server/passwords.js';
import { insertPerson } from '$lib/server/repos/people.js';
import { updateLodgeSettings } from '$lib/server/repos/settings.js';
import { insertUser, isSetupComplete, markSetupComplete } from '$lib/server/repos/users.js';
import { createSession, setSessionCookie } from '$lib/server/sessions.js';
import { asString, isValidEmail, normalizeEmail } from '$lib/server/validation.js';
import { isValidIsoDate } from '$lib/dates.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (isSetupComplete(locals.db)) {
		redirect(303, '/login');
	}
	return { csrf: locals.csrf, lodge: locals.lodge };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals, cookies }) => {
		if (isSetupComplete(locals.db)) {
			redirect(303, '/login');
		}

		const form = await request.formData();
		const csrf = asString(form.get('csrf'));
		if (csrf !== locals.csrf) {
			return fail(403, { error: 'Invalid CSRF token.' });
		}

		const lodgeName = asString(form.get('lodgeName'));
		const lodgeNumber = asString(form.get('lodgeNumber'));
		const obedience = asString(form.get('obedience'));
		const fullName = asString(form.get('fullName'));
		const gender = asString(form.get('gender')).toUpperCase();
		const birthDate = asString(form.get('birthDate'));
		const email = normalizeEmail(asString(form.get('email')));
		const password = asString(form.get('password'));
		const passwordConfirm = asString(form.get('passwordConfirm'));

		if (!lodgeName) return fail(400, { error: 'Lodge name is required.' });
		if (!fullName) return fail(400, { error: 'Administrator name is required.' });
		if (!Object.values(GENDERS).includes(gender)) {
			return fail(400, { error: 'Gender is required.' });
		}
		if (!birthDate || !isValidIsoDate(birthDate)) {
			return fail(400, { error: 'A valid date of birth is required.' });
		}
		if (!isValidEmail(email)) return fail(400, { error: 'A valid email is required.' });
		const pwError = validatePasswordStrength(password);
		if (pwError) return fail(400, { error: pwError });
		if (password !== passwordConfirm) return fail(400, { error: 'Passwords do not match.' });

		const passwordHash = await hashPassword(password);
		const db = locals.db;

		const userId = transaction(db, () => {
			updateLodgeSettings(db, {
				...locals.lodge,
				name: lodgeName,
				number: lodgeNumber,
				obedience
			});
			const personId = insertPerson(db, {
				fullName,
				gender,
				birthDate,
				email,
				phone: null,
				status: PERSON_STATUS.ACTIVE
			});
			const id = insertUser(db, {
				personId,
				passwordHash,
				role: ROLES.ADMIN,
				mustChangePassword: true
			});
			markSetupComplete(db);
			recordAudit(db, {
				actorUserId: id,
				actorEmail: email,
				action: 'setup_complete',
				entityType: 'lodge',
				entityId: 1,
				summary: `First-run setup: lodge "${lodgeName}", admin ${email}`
			});
			return id;
		});

		const session = createSession(db, userId);
		setSessionCookie(cookies, session.id, session.expiresAt);
		redirect(303, '/change-password');
	}
};
