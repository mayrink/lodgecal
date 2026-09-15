import { PERSON_STATUS } from '../constants.js';
import {
	addWeeks,
	birthdayOccurrencesInRange,
	calendarSheet,
	occurrencesInRange,
	Temporal,
	today
} from '../dates.js';
import { itemContext } from '../display.js';
import { listEvents } from './repos/events.js';

/**
 * Map person id -> { owner, relationship } for household dependents.
 * People who themselves have a User account are treated as Lodge members, not dependents.
 * @param {import('better-sqlite3').Database} db
 */
function householdIndex(db) {
	const memberIds = new Set(
		db.prepare('SELECT person_id FROM users').all().map((r) => r.person_id)
	);
	const rows = db
		.prepare(
			`SELECT hm.person_id, hm.relationship, p.id AS owner_id, p.full_name, p.gender, p.status
			 FROM household_memberships hm
			 JOIN users u ON u.id = hm.user_id
			 JOIN people p ON p.id = u.person_id
			 WHERE hm.ended_at IS NULL`
		)
		.all();
	/** @type {Map<number, { relationship: string, owner: object }>} */
	const map = new Map();
	for (const row of rows) {
		if (memberIds.has(row.person_id)) continue;
		map.set(row.person_id, {
			relationship: row.relationship,
			owner: {
				id: row.owner_id,
				full_name: row.full_name,
				gender: row.gender,
				status: row.status
			}
		});
	}
	return { memberIds, map };
}

/**
 * @param {object} person
 * @param {ReturnType<typeof householdIndex>} index
 */
function annotatePerson(person, index) {
	const link = index.map.get(person.id);
	return {
		person,
		owner: link?.owner ?? null,
		relationship: link?.relationship ?? null,
		isMember: index.memberIds.has(person.id)
	};
}

/**
 * Build chronological upcoming items in [from, to].
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   from: import('$lib/dates.js').Temporal.PlainDate | string,
 *   to: import('$lib/dates.js').Temporal.PlainDate | string,
 *   includeInactive?: boolean,
 *   terminology: Record<string, string>
 * }} opts
 */
export function collectUpcoming(db, opts) {
	const index = householdIndex(db);
	const people = db.prepare('SELECT * FROM people').all();
	const items = [];

	for (const person of people) {
		const inactive = person.status !== PERSON_STATUS.ACTIVE;
		if (inactive && !opts.includeInactive) continue;
		const dates = birthdayOccurrencesInRange(person.birth_date, opts.from, opts.to);
		const meta = annotatePerson(person, index);
		for (const date of dates) {
			const raw = {
				kind: 'birthday',
				person,
				owner: meta.owner,
				relationship: meta.relationship,
				typeLabel: 'Birthday'
			};
			items.push({
				id: `bday-${person.id}-${date.toString()}`,
				kind: 'birthday',
				iso: date.toString(),
				sheet: calendarSheet(date),
				title: person.full_name,
				context: itemContext(raw, opts.terminology),
				personId: person.id,
				inactive,
				linkable: false
			});
		}
	}

	for (const event of listEvents(db)) {
		if (event.status !== 'ACTIVE') continue;
		const relatedInactive = event.people.some((p) => p.status !== PERSON_STATUS.ACTIVE);
		if (relatedInactive && !opts.includeInactive) {
			const allInactive = event.people.length > 0 && event.people.every((p) => p.status !== PERSON_STATUS.ACTIVE);
			if (allInactive) continue;
		}
		const dates = occurrencesInRange(
			{ isoDate: event.iso_date, recurring: Boolean(event.recurring) },
			opts.from,
			opts.to
		);
		for (const date of dates) {
			const inactive = relatedInactive;
			if (inactive && !opts.includeInactive) continue;
			items.push({
				id: `evt-${event.id}-${date.toString()}`,
				kind: 'event',
				iso: date.toString(),
				sheet: calendarSheet(date),
				title: event.title,
				context: itemContext(
					{
						kind: 'event',
						relatedPeople: event.people,
						typeLabel: event.type_label
					},
					opts.terminology
				),
				eventId: event.id,
				inactive,
				linkable: false
			});
		}
	}

	items.sort((a, b) => {
		if (a.iso < b.iso) return -1;
		if (a.iso > b.iso) return 1;
		return a.title.localeCompare(b.title);
	});
	return items;
}

/**
 * Dashboard statistics and lists.
 * @param {import('better-sqlite3').Database} db
 * @param {{ upcomingWeeks: number, terminology: Record<string, string>, isAdmin: boolean }} opts
 */
export function dashboardData(db, opts) {
	const from = today();
	const to = addWeeks(from, opts.upcomingWeeks);
	const monthStart = Temporal.PlainDate.from({ year: from.year, month: from.month, day: 1 });
	const monthEnd = monthStart.add({ months: 1 }).subtract({ days: 1 });
	const nextMonthStart = monthStart.add({ months: 1 });
	const nextMonthEnd = nextMonthStart.add({ months: 1 }).subtract({ days: 1 });

	const terminology = opts.terminology;
	const activeUpcoming = collectUpcoming(db, {
		from,
		to,
		includeInactive: false,
		terminology
	});
	const monthItems = collectUpcoming(db, {
		from: monthStart,
		to: monthEnd,
		includeInactive: false,
		terminology
	});
	const nextMonthItems = collectUpcoming(db, {
		from: nextMonthStart,
		to: nextMonthEnd,
		includeInactive: false,
		terminology
	});

	let adminInactive = [];
	if (opts.isAdmin) {
		const all = collectUpcoming(db, { from, to, includeInactive: true, terminology });
		adminInactive = all.filter((item) => item.inactive);
	}

	const brothers = db
		.prepare(
			`SELECT COUNT(*) AS n FROM users u JOIN people p ON p.id = u.person_id WHERE p.status = 'ACTIVE'`
		)
		.get().n;
	const people = db.prepare(`SELECT COUNT(*) AS n FROM people WHERE status = 'ACTIVE'`).get().n;

	return {
		from: from.toString(),
		to: to.toString(),
		stats: {
			brothers,
			people,
			currentMonth: monthItems.length,
			nextWindow: activeUpcoming.length,
			nextMonth: nextMonthItems.length
		},
		upcoming: activeUpcoming,
		adminInactive
	};
}
