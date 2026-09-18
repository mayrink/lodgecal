import { nowIso } from '../db.js';
import { resolveRecurrence } from '../events.js';

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listEvents(db) {
	return db
		.prepare(
			`SELECT e.*, et.key AS type_key, et.label AS type_label, et.allows_recurrence
			 FROM events e
			 JOIN event_types et ON et.id = e.event_type_id
			 ORDER BY e.iso_date DESC, e.title COLLATE NOCASE`
		)
		.all();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {{
 *   eventTypeId: number,
 *   title: string,
 *   isoDate: string,
 *   details?: string,
 *   personName?: string,
 *   recurring?: boolean,
 *   status?: string
 * }} input
 * @param {object} eventType
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function updateEvent(db, id, input, eventType) {
	const recurrence = resolveRecurrence(eventType, Boolean(input.recurring));
	if (!recurrence.ok) return recurrence;
	db.prepare(
		`UPDATE events
		 SET event_type_id = ?, title = ?, iso_date = ?, details = ?, person_name = ?, recurring = ?, status = ?, updated_at = ?
		 WHERE id = ?`
	).run(
		input.eventTypeId,
		input.title,
		input.isoDate,
		input.details ?? '',
		input.personName ?? '',
		recurrence.recurring ? 1 : 0,
		input.status || 'ACTIVE',
		nowIso(),
		id
	);
	return { ok: true };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function archiveEvent(db, id) {
	db.prepare(`UPDATE events SET status = 'ARCHIVED', updated_at = ? WHERE id = ?`).run(nowIso(), id);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function reactivateEvent(db, id) {
	db.prepare(`UPDATE events SET status = 'ACTIVE', updated_at = ? WHERE id = ?`).run(nowIso(), id);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ key: string, label: string, allowsRecurrence: boolean }} input
 */
export function insertEventType(db, input) {
	const ts = nowIso();
	const result = db
		.prepare(
			`INSERT INTO event_types (key, label, allows_recurrence, is_system, derived, created_at, updated_at)
			 VALUES (?, ?, ?, 0, 0, ?, ?)`
		)
		.run(input.key, input.label, input.allowsRecurrence ? 1 : 0, ts, ts);
	return Number(result.lastInsertRowid);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {{ label: string, allowsRecurrence: boolean }} input
 */
export function updateEventType(db, id, input) {
	db.prepare(
		`UPDATE event_types SET label = ?, allows_recurrence = ?, updated_at = ? WHERE id = ? AND is_system = 0`
	).run(input.label, input.allowsRecurrence ? 1 : 0, nowIso(), id);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {boolean} isActive
 */
export function setEventTypeActive(db, id, isActive) {
	db.prepare(
		`UPDATE event_types SET is_active = ?, updated_at = ? WHERE id = ? AND is_system = 0`
	).run(isActive ? 1 : 0, nowIso(), id);
}
