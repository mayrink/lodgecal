import { nowIso } from '../db.js';
import { resolveRecurrence } from '../events.js';

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listEvents(db) {
	const rows = db
		.prepare(
			`SELECT e.*, et.key AS type_key, et.label AS type_label, et.allows_recurrence
			 FROM events e
			 JOIN event_types et ON et.id = e.event_type_id
			 ORDER BY e.iso_date DESC, e.title COLLATE NOCASE`
		)
		.all();
	const peopleStmt = db.prepare(
		`SELECT p.* FROM event_people ep JOIN people p ON p.id = ep.person_id WHERE ep.event_id = ?`
	);
	return rows.map((row) => ({ ...row, people: peopleStmt.all(row.id) }));
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function getEventById(db, id) {
	const row = db
		.prepare(
			`SELECT e.*, et.key AS type_key, et.label AS type_label, et.allows_recurrence, et.derived
			 FROM events e
			 JOIN event_types et ON et.id = e.event_type_id
			 WHERE e.id = ?`
		)
		.get(id);
	if (!row) return null;
	row.people = db
		.prepare(
			`SELECT p.* FROM event_people ep JOIN people p ON p.id = ep.person_id WHERE ep.event_id = ?`
		)
		.all(id);
	return row;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} eventId
 * @param {number[]} personIds
 */
export function setEventPeople(db, eventId, personIds) {
	db.prepare('DELETE FROM event_people WHERE event_id = ?').run(eventId);
	const link = db.prepare('INSERT INTO event_people (event_id, person_id) VALUES (?, ?)');
	for (const personId of personIds) {
		link.run(eventId, personId);
	}
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {{
 *   eventTypeId: number,
 *   title: string,
 *   isoDate: string,
 *   details?: string,
 *   recurring?: boolean,
 *   status?: string,
 *   personIds?: number[]
 * }} input
 * @param {object} eventType
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function updateEvent(db, id, input, eventType) {
	const recurrence = resolveRecurrence(eventType, Boolean(input.recurring));
	if (!recurrence.ok) return recurrence;
	db.prepare(
		`UPDATE events
		 SET event_type_id = ?, title = ?, iso_date = ?, details = ?, recurring = ?, status = ?, updated_at = ?
		 WHERE id = ?`
	).run(
		input.eventTypeId,
		input.title,
		input.isoDate,
		input.details ?? '',
		recurrence.recurring ? 1 : 0,
		input.status || 'ACTIVE',
		nowIso(),
		id
	);
	if (input.personIds) setEventPeople(db, id, input.personIds);
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
