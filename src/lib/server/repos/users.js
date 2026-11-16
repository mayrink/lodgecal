import { nowIso } from '../db.js';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ personId: number, passwordHash: string, role: string, mustChangePassword?: boolean }} input
 * @returns {number}
 */
export function insertUser(db, input) {
	const ts = nowIso();
	const result = db
		.prepare(
			`INSERT INTO users (person_id, password_hash, role, must_change_password, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`
		)
		.run(
			input.personId,
			input.passwordHash,
			input.role,
			input.mustChangePassword === false ? 0 : 1,
			ts,
			ts
		);
	return Number(result.lastInsertRowid);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function getUserById(db, id) {
	return db
		.prepare(
			`SELECT u.*, p.email, p.full_name, p.gender, p.status AS person_status
			 FROM users u JOIN people p ON p.id = u.person_id
			 WHERE u.id = ? AND u.deleted_at IS NULL`
		)
		.get(id) ?? null;
}

/**
 * Login lookup by case-normalized email on the Person record.
 * @param {import('better-sqlite3').Database} db
 * @param {string} emailNormalized
 */
export function getUserByEmail(db, emailNormalized) {
	return (
		db
			.prepare(
				`SELECT u.*, p.email, p.full_name, p.status AS person_status
				 FROM users u
				 JOIN people p ON p.id = u.person_id
				 WHERE p.email = ? AND u.deleted_at IS NULL`
			)
			.get(emailNormalized) ?? null
	);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listUsers(db) {
	return db
		.prepare(
			`SELECT u.id, u.person_id, u.role, u.must_change_password, u.created_at, u.updated_at,
			        p.full_name, p.gender, p.birth_date, p.email, p.phone,
			        p.status AS person_status
			 FROM users u
			 JOIN people p ON p.id = u.person_id
			 WHERE u.deleted_at IS NULL
			 ORDER BY p.full_name COLLATE NOCASE`
		)
		.all();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {string} passwordHash
 */
export function setPassword(db, userId, passwordHash) {
	db.prepare(
		`UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?`
	).run(passwordHash, nowIso(), userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {string} passwordHash
 */
export function setTemporaryPassword(db, userId, passwordHash) {
	db.prepare(
		`UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?`
	).run(passwordHash, nowIso(), userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {string} role
 */
export function setUserRole(db, userId, role) {
	db.prepare(`UPDATE users SET role = ?, updated_at = ? WHERE id = ?`).run(role, nowIso(), userId);
}

/**
 * Soft-delete a login account so historical records can retain their references.
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 */
export function softDeleteUser(db, userId) {
	const deletedAt = nowIso();
	const remove = db.transaction(() => {
		db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
		db.prepare('UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ?').run(
			deletedAt,
			deletedAt,
			userId
		);
	});
	remove();
}

/**
 * Permanently purge a Brother, his User account, his household dependents, and all their notes.
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @returns {{ deletedPeopleCount: number } | null}
 */
export function purgeBrotherAndFamily(db, userId) {
	const user = db.prepare('SELECT id, person_id FROM users WHERE id = ?').get(userId);
	if (!user) return null;

	const purge = db.transaction(() => {
		// Find all household dependent person_ids attached to this user who do not have their own user account
		const dependentIds = db
			.prepare(
				`SELECT hm.person_id
				 FROM household_memberships hm
				 WHERE hm.user_id = ?
				   AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.person_id = hm.person_id AND u2.id != ?)`
			)
			.all(userId, userId)
			.map((r) => r.person_id);

		const personIdsToDelete = Array.from(new Set([user.person_id, ...dependentIds]));

		// 1. Delete knowledge entries authored by this user or about these people
		db.prepare('DELETE FROM knowledge_entries WHERE author_user_id = ?').run(userId);
		const delKnowledgeForPerson = db.prepare('DELETE FROM knowledge_entries WHERE person_id = ?');
		for (const pid of personIdsToDelete) {
			delKnowledgeForPerson.run(pid);
		}

		// 2. Detach audit_log actor reference so audit history remains intact
		db.prepare('UPDATE audit_log SET actor_user_id = NULL WHERE actor_user_id = ?').run(userId);

		// 3. Delete sessions
		db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

		// 4. Delete household memberships referencing this user or these people
		db.prepare('DELETE FROM household_memberships WHERE user_id = ?').run(userId);
		const delMembershipForPerson = db.prepare(
			'DELETE FROM household_memberships WHERE person_id = ?'
		);
		for (const pid of personIdsToDelete) {
			delMembershipForPerson.run(pid);
		}

		// 5. Delete event_people links
		const delEventPerson = db.prepare('DELETE FROM event_people WHERE person_id = ?');
		for (const pid of personIdsToDelete) {
			delEventPerson.run(pid);
		}

		// 6. Delete user row (and any soft-deleted user rows pointing to these people)
		db.prepare('DELETE FROM users WHERE id = ?').run(userId);
		const delUserForPerson = db.prepare('DELETE FROM users WHERE person_id = ?');
		for (const pid of personIdsToDelete) {
			delUserForPerson.run(pid);
		}

		// 7. Delete people rows
		const delPerson = db.prepare('DELETE FROM people WHERE id = ?');
		for (const pid of personIdsToDelete) {
			delPerson.run(pid);
		}

		return { deletedPeopleCount: personIdsToDelete.length };
	});

	return purge();
}

/**
 * Restore a previously deleted login account with a new temporary password.
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {{ passwordHash: string, role: string }} input
 */
export function restoreDeletedUser(db, userId, input) {
	db.prepare(
		`UPDATE users
		 SET deleted_at = NULL, password_hash = ?, role = ?, must_change_password = 1, updated_at = ?
		 WHERE id = ?`
	).run(input.passwordHash, input.role, nowIso(), userId);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function countUsers(db) {
	return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function isSetupComplete(db) {
	const row = db.prepare('SELECT setup_completed FROM lodge_settings WHERE id = 1').get();
	return Boolean(row?.setup_completed);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function markSetupComplete(db) {
	db.prepare(`UPDATE lodge_settings SET setup_completed = 1, updated_at = ? WHERE id = 1`).run(
		nowIso()
	);
}
