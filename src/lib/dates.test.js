import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	Temporal,
	ageOn,
	birthdayOccurrencesInRange,
	nextBirthday,
	nowEpochMs,
	nowInstant,
	nowIso,
	occurrenceInYear,
	occurrencesInRange,
	plainDate
} from './dates.js';
import { validatePersonInput } from './server/validation.js';
import { closeDb, getDb } from './server/db.js';
import { createEvent, getEventTypeByKey, resolveRecurrence } from './server/events.js';
import { hashPassword } from './server/passwords.js';
import { insertPerson } from './server/repos/people.js';
import { insertUser } from './server/repos/users.js';
import { PERSON_STATUS, ROLES } from './constants.js';
import { canAccessPerson } from './server/repos/people.js';
import { setPassword, setTemporaryPassword, getUserById } from './server/repos/users.js';
import { verifyPassword } from './server/passwords.js';

describe('Temporal civil dates', () => {
	it('parses YYYY-MM-DD without JavaScript Date', () => {
		const d = plainDate('2024-02-29');
		expect(d instanceof Temporal.PlainDate).toBe(true);
		expect(d.year).toBe(2024);
		expect(d.month).toBe(2);
		expect(d.day).toBe(29);
	});

	it('provides global Temporal polyfill and Instant utilities', () => {
		expect(globalThis.Temporal).toBeDefined();
		const inst = nowInstant();
		expect(inst instanceof Temporal.Instant).toBe(true);
		expect(typeof nowIso()).toBe('string');
		expect(typeof nowEpochMs()).toBe('number');
		expect(nowEpochMs()).toBeGreaterThan(0);
	});

	it('validates person input and normalizes civil birth dates', () => {
		const parsedIso = validatePersonInput({
			fullName: 'Test Brother',
			gender: 'MALE',
			birthDate: '1985-05-20'
		});
		expect(parsedIso.ok).toBe(true);
		expect(parsedIso.value.birthDate).toBe('1985-05-20');

		const parsedDmy = validatePersonInput({
			fullName: 'Test Brother 2',
			gender: 'MALE',
			birthDate: '20/05/1985'
		});
		expect(parsedDmy.ok).toBe(true);
		expect(parsedDmy.value.birthDate).toBe('1985-05-20');

		const future = validatePersonInput({
			fullName: 'Future Child',
			gender: 'MALE',
			birthDate: '2099-01-01'
		});
		expect(future.ok).toBe(false);
		expect(future.error).toContain('cannot be in the future');
	});

	it('rejects invalid ISO dates', () => {
		expect(() => plainDate('2024/02/29')).toThrow();
		expect(() => plainDate('not-a-date')).toThrow();
	});

	it('shows Feb 29 birthdays on Feb 28 in non-leap years', () => {
		expect(occurrenceInYear(2023, 2, 29).toString()).toBe('2023-02-28');
		expect(occurrenceInYear(2024, 2, 29).toString()).toBe('2024-02-29');
		expect(nextBirthday('2000-02-29', '2023-01-01').toString()).toBe('2023-02-28');
		expect(nextBirthday('2000-02-29', '2024-01-01').toString()).toBe('2024-02-29');
		expect(nextBirthday('2000-02-29', '2024-03-01').toString()).toBe('2025-02-28');
	});

	it('lists birthday occurrences across a leap-year window', () => {
		const dates = birthdayOccurrencesInRange('1992-02-29', '2023-01-01', '2024-12-31').map((d) =>
			d.toString()
		);
		expect(dates).toEqual(['2023-02-28', '2024-02-29']);
	});

	it('non-recurring events appear only on their actual date', () => {
		const hits = occurrencesInRange(
			{ isoDate: '2024-06-15', recurring: false },
			'2024-01-01',
			'2025-12-31'
		);
		expect(hits.map((d) => d.toString())).toEqual(['2024-06-15']);
		const miss = occurrencesInRange(
			{ isoDate: '2023-06-15', recurring: false },
			'2024-01-01',
			'2024-12-31'
		);
		expect(miss).toEqual([]);
	});

	it('calculates age on display and never requires a stored age', () => {
		expect(ageOn('2000-06-15', '2024-06-14')).toBe(23);
		expect(ageOn('2000-06-15', '2024-06-15')).toBe(24);
	});
});

describe('event recurrence policy', () => {
	afterEach(() => {
		closeDb();
	});

	it('refuses recurrence for initiation, elevation, and exaltation', () => {
		const dir = mkdtempSync(join(tmpdir(), 'lodgecal-'));
		const db = getDb({ path: join(dir, 't.sqlite') });
		for (const key of ['initiation', 'elevation', 'exaltation']) {
			const type = getEventTypeByKey(db, key);
			expect(type).toBeTruthy();
			const denied = resolveRecurrence(type, true);
			expect(denied.ok).toBe(false);
			const created = createEvent(db, {
				eventTypeId: type.id,
				title: key,
				isoDate: '2024-03-01',
				recurring: true
			});
			expect(created.ok).toBe(false);
		}
		closeDb();
	});

	it('allows annual recurrence for wedding anniversary', () => {
		const dir = mkdtempSync(join(tmpdir(), 'lodgecal-'));
		const db = getDb({ path: join(dir, 't.sqlite') });
		const type = getEventTypeByKey(db, 'wedding_anniversary');
		const created = createEvent(db, {
			eventTypeId: type.id,
			title: 'Anniversary',
			isoDate: '2010-05-20',
			recurring: true
		});
		expect(created.ok).toBe(true);
		closeDb();
	});
});

describe('auth boundaries', () => {
	afterEach(() => {
		closeDb();
	});

	it('forces a temporary password change flag', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'lodgecal-'));
		const db = getDb({ path: join(dir, 't.sqlite') });
		const personId = insertPerson(db, {
			fullName: 'Test User',
			gender: 'MALE',
			birthDate: '1980-01-15',
			email: 'user@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const hash = await hashPassword('temporary-password-ok');
		const userId = insertUser(db, {
			personId,
			passwordHash: hash,
			role: ROLES.USER,
			mustChangePassword: true
		});
		let user = getUserById(db, userId);
		expect(user.must_change_password).toBe(1);
		const next = await hashPassword('replacement-password');
		setPassword(db, userId, next);
		user = getUserById(db, userId);
		expect(user.must_change_password).toBe(0);
		expect(await verifyPassword(user.password_hash, 'replacement-password')).toBe(true);
		setTemporaryPassword(db, userId, hash);
		user = getUserById(db, userId);
		expect(user.must_change_password).toBe(1);
		closeDb();
	});

	it('regular users cannot access another household person', () => {
		const dir = mkdtempSync(join(tmpdir(), 'lodgecal-'));
		const db = getDb({ path: join(dir, 't.sqlite') });
		const a = insertPerson(db, {
			fullName: 'Alpha',
			gender: 'MALE',
			birthDate: '1970-01-01',
			email: 'a@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const b = insertPerson(db, {
			fullName: 'Beta',
			gender: 'MALE',
			birthDate: '1971-01-01',
			email: 'b@example.com',
			phone: null,
			status: PERSON_STATUS.ACTIVE
		});
		const userA = { id: 1, personId: a, role: 'USER' };
		expect(canAccessPerson(db, userA, a)).toBe(true);
		expect(canAccessPerson(db, userA, b)).toBe(false);
		expect(canAccessPerson(db, { id: 9, personId: a, role: 'ADMIN' }, b)).toBe(true);
		closeDb();
	});
});
