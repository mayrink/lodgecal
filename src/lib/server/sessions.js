import { randomBytes } from 'node:crypto';
import { SESSION_COOKIE } from '../constants.js';
import { nowIso } from './db.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @returns {string}
 */
export function createSessionId() {
	return randomBytes(32).toString('hex');
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @returns {{ id: string, expiresAt: string }}
 */
export function createSession(db, userId) {
	const id = createSessionId();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
	db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
		id,
		userId,
		expiresAt,
		nowIso()
	);
	return { id, expiresAt };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string | undefined} sessionId
 * @returns {{ user: object, person: object, sessionId: string } | null}
 */
export function getSessionUser(db, sessionId) {
	if (!sessionId) return null;
	const row = db
		.prepare(
			`SELECT
				s.id AS session_id,
				s.expires_at,
				u.id AS user_id,
				u.person_id,
				u.role,
				u.must_change_password,
				p.full_name,
				p.email,
				p.gender,
				p.birth_date,
				p.phone,
				p.status AS person_status
			 FROM sessions s
			 JOIN users u ON u.id = s.user_id
			 JOIN people p ON p.id = u.person_id
			 WHERE s.id = ? AND u.deleted_at IS NULL`
		)
		.get(sessionId);

	if (!row) return null;
	if (row.person_status !== 'ACTIVE') {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
		return null;
	}
	if (new Date(row.expires_at).getTime() <= Date.now()) {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
		return null;
	}

	return {
		sessionId: row.session_id,
		user: {
			id: row.user_id,
			personId: row.person_id,
			role: row.role,
			mustChangePassword: Boolean(row.must_change_password)
		},
		person: {
			id: row.person_id,
			fullName: row.full_name,
			email: row.email,
			gender: row.gender,
			birthDate: row.birth_date,
			phone: row.phone,
			status: row.person_status
		}
	};
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 */
export function deleteSession(db, sessionId) {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 */
export function deleteUserSessions(db, userId) {
	db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function purgeExpiredSessions(db) {
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} sessionId
 * @param {string} expiresAt
 */
export function setSessionCookie(cookies, sessionId, expiresAt) {
	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: new Date(expiresAt)
	});
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export function clearSessionCookie(cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
