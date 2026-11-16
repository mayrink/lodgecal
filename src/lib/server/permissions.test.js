import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PERSON_STATUS, RELATIONSHIPS, ROLES } from '$lib/constants.js';
import { closeDb, getDb } from './db.js';
import { insertKnowledge, listKnowledge } from './repos/knowledge.js';
import {
	addHouseholdMember,
	canAccessPerson,
	getActiveSpouse,
	householdPersonIds,
	insertPerson,
	listBrothersDirectory,
	personHasUserAccount,
	setPersonStatus
} from './repos/people.js';
import { hashPassword } from './passwords.js';
import { insertUser } from './repos/users.js';
import { isLoginThrottled, GENERIC_LOGIN_FAILURE } from './auth.js';
import { recordLoginAttempt } from './audit.js';
import { LOGIN_MAX_FAILURES } from '$lib/constants.js';
import { createEvent, getEventTypeByKey } from './events.js';
import { dashboardData } from './upcoming.js';

function tempDb() {
	const dir = mkdtempSync(join(tmpdir(), 'lodgecal-'));
	return getDb({ path: join(dir, 't.sqlite') });
}

describe('household privacy', () => {
	afterEach(() => closeDb());

	it('enforces one active spouse and household-only access', async () => {
		const db = tempDb();
		const a = insertPerson(db, {
			fullName: 'Alpha',
			gender: 'MALE',
			birthDate: '1970-01-01',
			email: 'a@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const hash = await hashPassword('temporary-password-ok');
		const userId = insertUser(db, {
			personId: a,
			passwordHash: hash,
			role: ROLES.USER
		});
		const spouse1 = insertPerson(db, {
			fullName: 'Spouse One',
			gender: 'FEMALE',
			birthDate: '1972-02-02',
			email: null,
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const spouse2 = insertPerson(db, {
			fullName: 'Spouse Two',
			gender: 'MALE',
			birthDate: '1973-03-03',
			email: null,
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		expect(addHouseholdMember(db, userId, spouse1, RELATIONSHIPS.SPOUSE).ok).toBe(true);
		expect(addHouseholdMember(db, userId, spouse2, RELATIONSHIPS.SPOUSE).ok).toBe(false);
		expect(getActiveSpouse(db, userId).person_id).toBe(spouse1);

		const outsider = insertPerson(db, {
			fullName: 'Outsider',
			gender: 'MALE',
			birthDate: '1960-01-01',
			email: 'out@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const user = { id: userId, personId: a, role: ROLES.USER };
		expect(canAccessPerson(db, user, spouse1)).toBe(true);
		expect(canAccessPerson(db, user, outsider)).toBe(false);
		expect(householdPersonIds(db, userId, a).sort()).toEqual([a, spouse1].sort());
	});

	it('does not treat a person who is a User as another household child in upcoming list', async () => {
		const db = tempDb();
		const hash = await hashPassword('temporary-password-ok');
		const parent = insertPerson(db, {
			fullName: 'Parent Member',
			gender: 'MALE',
			birthDate: '1965-05-05',
			email: 'parent@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const parentUser = insertUser(db, { personId: parent, passwordHash: hash, role: ROLES.USER });
		const childMember = insertPerson(db, {
			fullName: 'Grown Child Member',
			gender: 'MALE',
			birthDate: '1990-07-07',
			email: 'child@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		insertUser(db, { personId: childMember, passwordHash: hash, role: ROLES.USER });
		addHouseholdMember(db, parentUser, childMember, RELATIONSHIPS.CHILD);
		expect(personHasUserAccount(db, childMember)).toBe(true);

		const dash = dashboardData(db, {
			upcomingWeeks: 52,
			terminology: { brother: 'Bro∴', spouse: 'Spouse', child: 'Child', son: 'Son', daughter: 'Daughter' },
			isAdmin: true
		});
		const grown = dash.upcoming.filter((i) => i.personId === childMember && i.kind === 'birthday');
		expect(grown.length).toBeGreaterThan(0);
		for (const item of grown) {
			expect(item.context.includes('of Bro∴')).toBe(false);
		}
	});

	it('hides inactive households from regular upcoming lists', async () => {
		const db = tempDb();
		insertPerson(db, {
			fullName: 'Departed',
			gender: 'MALE',
			birthDate: '1950-01-01',
			email: null,
			phone: null,
			status: PERSON_STATUS.DEPARTED
		});
		const dashUser = dashboardData(db, {
			upcomingWeeks: 52,
			terminology: {},
			isAdmin: false
		});
		expect(dashUser.upcoming.some((i) => i.title === 'Departed')).toBe(false);
		const dashAdmin = dashboardData(db, {
			upcomingWeeks: 52,
			terminology: {},
			isAdmin: true
		});
		expect(dashAdmin.adminInactive.some((i) => i.title === 'Departed')).toBe(true);
	});

	it('shows Turns X (age) and notes only to Admin or for a Brother’s own spouse and children', async () => {
		const db = tempDb();
		const hash = await hashPassword('temporary-password-ok');
		const broA = insertPerson(db, {
			fullName: 'Paulo Moreira',
			gender: 'MALE',
			birthDate: '1980-06-10',
			email: 'paulo@example.com',
			phone: '111-222',
			status: PERSON_STATUS.ACTIVE
		});
		const userA = insertUser(db, { personId: broA, passwordHash: hash, role: ROLES.USER });
		const childA = insertPerson(db, {
			fullName: 'Isadora Moreira',
			gender: 'FEMALE',
			birthDate: '2012-06-15',
			email: null,
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		addHouseholdMember(db, userA, childA, RELATIONSHIPS.CHILD);
		insertKnowledge(db, {
			personId: childA,
			body: 'Draws manga',
			authorUserId: userA,
			effectiveDate: '2026-09-01'
		});

		const broB = insertPerson(db, {
			fullName: 'Henrique Almeida',
			gender: 'MALE',
			birthDate: '1978-07-10',
			email: 'henrique@example.com',
			phone: '999-888',
			status: PERSON_STATUS.ACTIVE
		});
		const userB = insertUser(db, { personId: broB, passwordHash: hash, role: ROLES.USER });
		const childB = insertPerson(db, {
			fullName: 'Beatriz Almeida',
			gender: 'FEMALE',
			birthDate: '2008-07-12',
			email: null,
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		addHouseholdMember(db, userB, childB, RELATIONSHIPS.CHILD);
		insertKnowledge(db, {
			personId: childB,
			body: 'Studies veterinary medicine',
			authorUserId: userB,
			effectiveDate: '2026-09-01'
		});

		// View as Brother A (regular USER)
		const dashForA = dashboardData(db, {
			upcomingWeeks: 52,
			terminology: {},
			isAdmin: false,
			viewerPersonId: broA
		});
		const ownChildRow = dashForA.upcoming.find((i) => i.personId === childA);
		const otherChildRow = dashForA.upcoming.find((i) => i.personId === childB);
		const otherBroRow = dashForA.upcoming.find((i) => i.personId === broB);

		expect(ownChildRow.turns).toMatch(/^Turns \d+$/);
		expect(ownChildRow.canSee).toBe(true);
		expect(ownChildRow.trivia.map((t) => t.body)).toEqual(['Draws manga']);

		expect(otherChildRow.turns).toBeNull();
		expect(otherChildRow.canSee).toBe(false);
		expect(otherChildRow.locked).toBe(true);
		expect(otherChildRow.trivia).toEqual([]);

		expect(otherBroRow.turns).toBeNull();
		expect(otherBroRow.canSee).toBe(false);

		// View as Admin
		const dashForAdmin = dashboardData(db, {
			upcomingWeeks: 52,
			terminology: {},
			isAdmin: true,
			viewerPersonId: broA
		});
		const adminOtherChild = dashForAdmin.upcoming.find((i) => i.personId === childB);
		expect(adminOtherChild.turns).toMatch(/^Turns \d+$/);
		expect(adminOtherChild.canSee).toBe(true);
		expect(adminOtherChild.trivia.map((t) => t.body)).toEqual(['Studies veterinary medicine']);
	});

	it('excludes sleeping brothers from regular Brothers directory query', async () => {
		const db = tempDb();
		const hash = await hashPassword('temporary-password-ok');
		const activeP = insertPerson(db, {
			fullName: 'Active Brother',
			gender: 'MALE',
			birthDate: '1980-01-01',
			email: 'active@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		insertUser(db, { personId: activeP, passwordHash: hash, role: ROLES.USER });

		const sleepingP = insertPerson(db, {
			fullName: 'Sleeping Brother',
			gender: 'MALE',
			birthDate: '1975-01-01',
			email: 'sleep@example.com',
			phone: null,
			status: PERSON_STATUS.INACTIVE
		});
		insertUser(db, { personId: sleepingP, passwordHash: hash, role: ROLES.USER });
		setPersonStatus(db, sleepingP, PERSON_STATUS.INACTIVE);

		const regularList = listBrothersDirectory(db, { includeInactive: false });
		expect(regularList.map((b) => b.full_name)).toEqual(['Active Brother']);

		const adminList = listBrothersDirectory(db, { includeInactive: true });
		expect(adminList.map((b) => b.full_name)).toEqual(['Active Brother', 'Sleeping Brother']);
	});
});

describe('knowledge history', () => {
	afterEach(() => closeDb());

	it('appends entries instead of overwriting', async () => {
		const db = tempDb();
		const personId = insertPerson(db, {
			fullName: 'Noted',
			gender: 'MALE',
			birthDate: '1980-01-01',
			email: 'n@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const hash = await hashPassword('temporary-password-ok');
		const userId = insertUser(db, {
			personId,
			passwordHash: hash,
			role: ROLES.USER
		});
		insertKnowledge(db, { personId, body: 'First', authorUserId: userId, effectiveDate: '2024-01-01' });
		insertKnowledge(db, { personId, body: 'Second', authorUserId: userId, effectiveDate: '2024-06-01' });
		const entries = listKnowledge(db, personId);
		expect(entries.map((e) => e.body)).toEqual(['Second', 'First']);
	});
});

describe('login throttling', () => {
	afterEach(() => closeDb());

	it('throttles after too many failures', () => {
		const db = tempDb();
		for (let i = 0; i < LOGIN_MAX_FAILURES; i += 1) {
			recordLoginAttempt(db, 'x@example.com', false);
		}
		expect(isLoginThrottled(db, 'x@example.com')).toBe(true);
		expect(GENERIC_LOGIN_FAILURE).toMatch(/Invalid email or password/);
	});
});

describe('crafted recurrence requests', () => {
	afterEach(() => closeDb());

	it('ignores recurrence on initiation even when requested', () => {
		const db = tempDb();
		const type = getEventTypeByKey(db, 'initiation');
		const created = createEvent(db, {
			eventTypeId: type.id,
			title: 'Crafted',
			isoDate: '2020-01-01',
			recurring: true
		});
		expect(created.ok).toBe(false);
	});
});
