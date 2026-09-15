import { nowIso } from './db.js';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   actorUserId?: number | null,
 *   actorEmail?: string | null,
 *   action: string,
 *   entityType: string,
 *   entityId?: string | number | null,
 *   summary: string
 * }} entry
 */
export function recordAudit(db, entry) {
	db.prepare(
		`INSERT INTO audit_log (actor_user_id, actor_email, action, entity_type, entity_id, summary, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		entry.actorUserId ?? null,
		entry.actorEmail ?? null,
		entry.action,
		entry.entityType,
		entry.entityId == null ? null : String(entry.entityId),
		entry.summary,
		nowIso()
	);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} emailNormalized
 * @param {boolean} success
 */
export function recordLoginAttempt(db, emailNormalized, success) {
	db.prepare(
		`INSERT INTO login_attempts (email_normalized, success, created_at) VALUES (?, ?, ?)`
	).run(emailNormalized, success ? 1 : 0, nowIso());
}

/**
 * @param {unknown} before
 * @param {unknown} after
 * @returns {string}
 */
export function summarizeChange(before, after) {
	const keys = new Set([
		...Object.keys(before && typeof before === 'object' ? before : {}),
		...Object.keys(after && typeof after === 'object' ? after : {})
	]);
	const parts = [];
	for (const key of keys) {
		if (key === 'password_hash' || key === 'password' || key === 'token') continue;
		const b = before?.[key];
		const a = after?.[key];
		if (b !== a) {
			parts.push(`${key}: ${stringifySafe(b)} -> ${stringifySafe(a)}`);
		}
	}
	return parts.join('; ') || 'no field changes';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringifySafe(value) {
	if (value == null) return 'null';
	if (typeof value === 'string') {
		return value.length > 80 ? `${value.slice(0, 77)}...` : value;
	}
	return String(value);
}
