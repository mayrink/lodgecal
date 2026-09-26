import { error, redirect } from '@sveltejs/kit';
import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS, PERSON_STATUS, ROLES, SESSION_COOKIE } from '../constants.js';
import { recordAudit, recordLoginAttempt } from './audit.js';
import { getDb } from './db.js';
import { verifyPassword } from './passwords.js';
import { getUserByEmail } from './repos/users.js';
import {
	clearSessionCookie,
	createSession,
	deleteSession,
	getSessionUser,
	setSessionCookie
} from './sessions.js';
import { normalizeEmail } from './validation.js';

/**
 * Generic login failure — never distinguish unknown email vs bad password.
 */
export const GENERIC_LOGIN_FAILURE = 'Invalid email or password.';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} emailNormalized
 * @returns {boolean}
 */
export function isLoginThrottled(db, emailNormalized) {
	const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
	const row = db
		.prepare(
			`SELECT COUNT(*) AS n FROM login_attempts
			 WHERE email_normalized = ? AND success = 0 AND created_at >= ?`
		)
		.get(emailNormalized, since);
	return row.n >= LOGIN_MAX_FAILURES;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: true, mustChangePassword: boolean } | { ok: false, error: string }>}
 */
export async function login(db, cookies, email, password) {
	const emailNormalized = normalizeEmail(email);
	if (!emailNormalized || !password) {
		return { ok: false, error: GENERIC_LOGIN_FAILURE };
	}

	if (isLoginThrottled(db, emailNormalized)) {
		recordLoginAttempt(db, emailNormalized, false);
		recordAudit(db, {
			actorEmail: emailNormalized,
			action: 'login_throttled',
			entityType: 'session',
			summary: 'Failed login (throttled)'
		});
		return { ok: false, error: GENERIC_LOGIN_FAILURE };
	}

	const user = getUserByEmail(db, emailNormalized);
	const passwordOk = user ? await verifyPassword(user.password_hash, password) : false;

	if (!user || user.person_status !== PERSON_STATUS.ACTIVE || !passwordOk) {
		recordLoginAttempt(db, emailNormalized, false);
		recordAudit(db, {
			actorEmail: emailNormalized,
			action: 'login_failed',
			entityType: 'session',
			summary: 'Failed login'
		});
		return { ok: false, error: GENERIC_LOGIN_FAILURE };
	}

	recordLoginAttempt(db, emailNormalized, true);
	recordAudit(db, {
		actorUserId: user.id,
		actorEmail: emailNormalized,
		action: 'login_success',
		entityType: 'session',
		entityId: user.id,
		summary: 'Successful login'
	});

	const session = createSession(db, user.id);
	setSessionCookie(cookies, session.id, session.expiresAt);
	return { ok: true, mustChangePassword: Boolean(user.must_change_password) };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export function logout(db, cookies) {
	const sessionId = cookies.get(SESSION_COOKIE);
	if (sessionId) deleteSession(db, sessionId);
	clearSessionCookie(cookies);
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export function currentAuth(cookies) {
	const db = getDb();
	return getSessionUser(db, cookies.get(SESSION_COOKIE));
}

/**
 * @param {App.Locals} locals
 */
export function requireUser(locals) {
	if (!locals.user) {
		redirect(303, '/login');
	}
	if (locals.user.mustChangePassword) {
		redirect(303, '/change-password');
	}
	return locals.user;
}

/**
 * @param {App.Locals} locals
 */
export function requireAdmin(locals) {
	const user = requireUser(locals);
	if (user.role !== ROLES.ADMIN) {
		error(403, 'Administrator access required.');
	}
	return user;
}

/**
 * Allow a logged-in user who still must change password.
 * @param {App.Locals} locals
 */
export function requireAuthenticated(locals) {
	if (!locals.user) {
		redirect(303, '/login');
	}
	return locals.user;
}
