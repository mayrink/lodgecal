import { NON_RECURRING_EVENT_TYPE_KEYS } from '../constants.js';
import { nowIso } from './db.js';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} eventTypeId
 */
export function getEventType(db, eventTypeId) {
	return db.prepare('SELECT * FROM event_types WHERE id = ?').get(eventTypeId) ?? null;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} key
 */
export function getEventTypeByKey(db, key) {
	return db.prepare('SELECT * FROM event_types WHERE key = ?').get(key) ?? null;
}

/**
 * Server-side recurrence policy. Initiation, Elevation, Exaltation never recur.
 * @param {{ key: string, allows_recurrence: number }} eventType
 * @param {boolean} requested
 * @returns {{ ok: true, recurring: boolean } | { ok: false, error: string }}
 */
export function resolveRecurrence(eventType, requested) {
	if (!eventType) return { ok: false, error: 'Unknown event type.' };
	if (NON_RECURRING_EVENT_TYPE_KEYS.includes(eventType.key) || eventType.allows_recurrence !== 1) {
		if (requested) {
			return {
				ok: false,
				error: `${eventType.label} events cannot recur.`
			};
		}
		return { ok: true, recurring: false };
	}
	return { ok: true, recurring: Boolean(requested) };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   eventTypeId: number,
 *   title: string,
 *   isoDate: string,
 *   details?: string,
 *   recurring?: boolean,
 *   personIds?: number[]
 * }} input
 * @returns {{ ok: true, id: number } | { ok: false, error: string }}
 */
export function createEvent(db, input) {
	const type = getEventType(db, input.eventTypeId);
	const recurrence = resolveRecurrence(type, Boolean(input.recurring));
	if (!recurrence.ok) return recurrence;

	const ts = nowIso();
	const result = db
		.prepare(
			`INSERT INTO events (event_type_id, title, iso_date, details, recurring, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`
		)
		.run(
			input.eventTypeId,
			input.title,
			input.isoDate,
			input.details ?? '',
			recurrence.recurring ? 1 : 0,
			ts,
			ts
		);
	const id = Number(result.lastInsertRowid);
	if (input.personIds?.length) {
		const link = db.prepare('INSERT INTO event_people (event_id, person_id) VALUES (?, ?)');
		for (const personId of input.personIds) {
			link.run(id, personId);
		}
	}
	return { ok: true, id };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listEventTypes(db) {
	return db.prepare('SELECT * FROM event_types ORDER BY label COLLATE NOCASE').all();
}
