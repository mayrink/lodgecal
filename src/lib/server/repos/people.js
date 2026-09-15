import { RELATIONSHIPS } from '../../constants.js';
import { nowIso } from '../db.js';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object} person
 * @returns {number}
 */
export function insertPerson(db, person) {
	const ts = nowIso();
	const result = db
		.prepare(
			`INSERT INTO people (full_name, gender, birth_date, email, phone, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			person.fullName,
			person.gender,
			person.birthDate,
			person.email,
			person.phone,
			person.status,
			ts,
			ts
		);
	return Number(result.lastInsertRowid);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {object} person
 */
export function updatePerson(db, id, person) {
	db.prepare(
		`UPDATE people
		 SET full_name = ?, gender = ?, birth_date = ?, email = ?, phone = ?, status = ?, updated_at = ?
		 WHERE id = ?`
	).run(
		person.fullName,
		person.gender,
		person.birthDate,
		person.email,
		person.phone,
		person.status,
		nowIso(),
		id
	);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 */
export function getPersonById(db, id) {
	return db.prepare('SELECT * FROM people WHERE id = ?').get(id) ?? null;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} email
 */
export function getPersonByEmail(db, email) {
	if (!email) return null;
	return db.prepare('SELECT * FROM people WHERE email = ?').get(email) ?? null;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ includeInactive?: boolean }} [opts]
 */
export function listPeople(db, opts = {}) {
	if (opts.includeInactive) {
		return db.prepare('SELECT * FROM people ORDER BY full_name COLLATE NOCASE').all();
	}
	return db
		.prepare(`SELECT * FROM people WHERE status = 'ACTIVE' ORDER BY full_name COLLATE NOCASE`)
		.all();
}

/**
 * Count active people whose person record is a Lodge member (has a user account).
 * @param {import('better-sqlite3').Database} db
 */
export function countActiveBrothers(db) {
	return db
		.prepare(
			`SELECT COUNT(*) AS n
			 FROM users u
			 JOIN people p ON p.id = u.person_id
			 WHERE p.status = 'ACTIVE'`
		)
		.get().n;
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function countActivePeople(db) {
	return db.prepare(`SELECT COUNT(*) AS n FROM people WHERE status = 'ACTIVE'`).get().n;
}

/**
 * Household of a user: self + active spouse/children memberships.
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 */
export function getHousehold(db, userId) {
	const user = db
		.prepare(
			`SELECT u.id AS user_id, u.role, p.*
			 FROM users u JOIN people p ON p.id = u.person_id
			 WHERE u.id = ?`
		)
		.get(userId);
	if (!user) return null;

	const members = db
		.prepare(
			`SELECT hm.id AS membership_id, hm.relationship, hm.ended_at, p.*
			 FROM household_memberships hm
			 JOIN people p ON p.id = hm.person_id
			 WHERE hm.user_id = ? AND hm.ended_at IS NULL
			 ORDER BY hm.relationship, p.full_name COLLATE NOCASE`
		)
		.all(userId);

	return {
		user,
		spouse: members.find((m) => m.relationship === RELATIONSHIPS.SPOUSE) ?? null,
		children: members.filter((m) => m.relationship === RELATIONSHIPS.CHILD)
	};
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 */
export function getActiveSpouse(db, userId) {
	return (
		db
			.prepare(
				`SELECT hm.*, p.full_name
				 FROM household_memberships hm
				 JOIN people p ON p.id = hm.person_id
				 WHERE hm.user_id = ? AND hm.relationship = 'SPOUSE' AND hm.ended_at IS NULL`
			)
			.get(userId) ?? null
	);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {number} personId
 * @param {'SPOUSE' | 'CHILD'} relationship
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function addHouseholdMember(db, userId, personId, relationship) {
	if (relationship === RELATIONSHIPS.SPOUSE) {
		const existing = getActiveSpouse(db, userId);
		if (existing) {
			return { ok: false, error: 'A User may have at most one active spouse.' };
		}
	}
	const ts = nowIso();
	db.prepare(
		`INSERT INTO household_memberships (user_id, person_id, relationship, ended_at, created_at, updated_at)
		 VALUES (?, ?, ?, NULL, ?, ?)`
	).run(userId, personId, relationship, ts, ts);
	return { ok: true };
}

/**
 * Administrator archive/end-relationship (not routine deletion).
 * @param {import('better-sqlite3').Database} db
 * @param {number} membershipId
 */
export function endHouseholdMembership(db, membershipId) {
	const ts = nowIso();
	db.prepare(
		`UPDATE household_memberships SET ended_at = ?, updated_at = ? WHERE id = ? AND ended_at IS NULL`
	).run(ts, ts, membershipId);
}

/**
 * Person IDs that belong to a user's household (self + spouse + children).
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @param {number} personId
 * @returns {number[]}
 */
export function householdPersonIds(db, userId, personId) {
	const ids = db
		.prepare(
			`SELECT person_id FROM household_memberships WHERE user_id = ? AND ended_at IS NULL`
		)
		.all(userId)
		.map((r) => r.person_id);
	return [personId, ...ids];
}

/**
 * True if personId is in the user's household.
 * @param {import('better-sqlite3').Database} db
 * @param {{ id: number, personId: number }} user
 * @param {number} personId
 */
export function canAccessPerson(db, user, personId) {
	if (user.role === 'ADMIN') return true;
	return householdPersonIds(db, user.id, user.personId).includes(Number(personId));
}

/**
 * Person who has a User account (Lodge member). Those people must not be shown as another User's child.
 * @param {import('better-sqlite3').Database} db
 * @param {number} personId
 */
export function personHasUserAccount(db, personId) {
	return Boolean(db.prepare('SELECT id FROM users WHERE person_id = ?').get(personId));
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {number} personId
 * @param {string} status
 */
export function setPersonStatus(db, personId, status) {
	db.prepare('UPDATE people SET status = ?, updated_at = ? WHERE id = ?').run(
		status,
		nowIso(),
		personId
	);
}

/**
 * Users who can be household heads (for attaching a new family member).
 * @param {import('better-sqlite3').Database} db
 */
export function listHouseholdHeads(db) {
	return db
		.prepare(
			`SELECT u.id AS user_id, p.id AS person_id, p.full_name, p.email
			 FROM users u JOIN people p ON p.id = u.person_id
			 ORDER BY p.full_name COLLATE NOCASE`
		)
		.all();
}
