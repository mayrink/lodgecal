import { today } from '../../dates.js';
import { nowIso } from '../db.js';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ personId: number, body: string, effectiveDate?: string, authorUserId: number }} input
 * @returns {number}
 */
export function insertKnowledge(db, input) {
	const result = db
		.prepare(
			`INSERT INTO knowledge_entries (person_id, body, effective_date, author_user_id, retired, created_at)
			 VALUES (?, ?, ?, ?, 0, ?)`
		)
		.run(
			input.personId,
			input.body,
			input.effectiveDate || today().toString(),
			input.authorUserId,
			nowIso()
		);
	return Number(result.lastInsertRowid);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} personId
 * @param {{ includeRetired?: boolean }} [opts]
 */
export function listKnowledge(db, personId, opts = {}) {
	if (opts.includeRetired) {
		return db
			.prepare(
				`SELECT k.*, p.full_name AS author_name
				 FROM knowledge_entries k
				 JOIN users u ON u.id = k.author_user_id
				 JOIN people p ON p.id = u.person_id
				 WHERE k.person_id = ?
				 ORDER BY k.effective_date DESC, k.created_at DESC`
			)
			.all(personId);
	}
	return db
		.prepare(
			`SELECT k.*, p.full_name AS author_name
			 FROM knowledge_entries k
			 JOIN users u ON u.id = k.author_user_id
			 JOIN people p ON p.id = u.person_id
			 WHERE k.person_id = ? AND k.retired = 0
			 ORDER BY k.effective_date DESC, k.created_at DESC`
		)
		.all(personId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function getKnowledgeById(db, id) {
	return db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(id) ?? null;
}

/**
 * Admin correction: retire an entry. History is preserved.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function retireKnowledge(db, id) {
	db.prepare('UPDATE knowledge_entries SET retired = 1 WHERE id = ?').run(id);
}

/**
 * Admin correction of body text without deleting history — inserts a note via retire + new row is preferred.
 * This only toggles retired so previous entries remain.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {string} body
 */
export function correctKnowledge(db, id, body, effectiveDate) {
	db.prepare('UPDATE knowledge_entries SET body = ?, effective_date = ? WHERE id = ?').run(
		body,
		effectiveDate,
		id
	);
}
