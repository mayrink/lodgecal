import { PERSON_STATUS } from '../constants.js';
import {
	addWeeks,
	ageOn,
	birthdayOccurrencesInRange,
	calendarSheet,
	daysBetween,
	formatDateShortYear,
	formatDayMonthShort,
	occurrencesInRange,
	Temporal,
	today,
	weekdayShort
} from '../dates.js';
import { childLabel, honorificName, itemContext } from '../display.js';
import { t, translateEventTypeLabel } from '../i18n.js';
import { listEvents } from './repos/events.js';

/**
 * Map person id -> { owner, relationship } for household dependents.
 * People who themselves have a User account are treated as Lodge members, not dependents.
 * @param {import('better-sqlite3').Database} db
 */
function householdIndex(db) {
	const memberIds = new Set(
		db
			.prepare('SELECT person_id FROM users WHERE deleted_at IS NULL')
			.all()
			.map((r) => r.person_id)
	);
	const rows = db
		.prepare(
			`SELECT hm.person_id, hm.relationship, p.id AS owner_id, p.full_name, p.gender, p.status, p.email, p.phone
			 FROM household_memberships hm
			 JOIN users u ON u.id = hm.user_id
			 JOIN people p ON p.id = u.person_id
			 WHERE hm.ended_at IS NULL AND u.deleted_at IS NULL`
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
				status: row.status,
				email: row.email,
				phone: row.phone
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
 * Load active knowledge entries grouped by person_id.
 * @param {import('better-sqlite3').Database} db
 * @param {string} [locale]
 */
function activeKnowledgeMap(db, locale = 'en') {
	const rows = db
		.prepare(
			`SELECT id, person_id, body, effective_date
			 FROM knowledge_entries
			 WHERE retired = 0
			 ORDER BY effective_date DESC, created_at DESC`
		)
		.all();
	const map = new Map();
	for (const row of rows) {
		const list = map.get(row.person_id) ?? [];
		list.push({
			id: row.id,
			body: row.body,
			effectiveDate: row.effective_date,
			dateFormatted: formatDateShortYear(row.effective_date, locale)
		});
		map.set(row.person_id, list);
	}
	return map;
}

/**
 * Format relationship label for the Upcoming Birthdays feed.
 */
function formatRelationForViewer(person, meta, terminology, viewerPersonId, locale = 'en') {
	if (viewerPersonId && person.id === viewerPersonId) {
		return t(locale, 'relations.youBrother');
	}
	if (viewerPersonId && meta.owner && meta.owner.id === viewerPersonId) {
		if (meta.relationship === 'SPOUSE') {
			return t(locale, 'relations.yourSpouse');
		}
		if (meta.relationship === 'CHILD') {
			if (person.gender === 'FEMALE') return t(locale, 'relations.yourDaughter');
			if (person.gender === 'MALE') return t(locale, 'relations.yourSon');
			return t(locale, 'relations.yourChild');
		}
	}
	if (meta.owner && meta.relationship === 'SPOUSE') {
		return t(locale, 'relations.spouseOf', {
			spouse: terminology.spouse || t(locale, 'terms.spouse'),
			owner: honorificName(meta.owner, terminology)
		});
	}
	if (meta.owner && meta.relationship === 'CHILD') {
		return t(locale, 'relations.childOf', {
			child: childLabel(person, terminology),
			owner: honorificName(meta.owner, terminology)
		});
	}
	if (meta.isMember) {
		return person.gender === 'FEMALE'
			? t(locale, 'relations.sister')
			: t(locale, 'relations.brother');
	}
	return t(locale, 'relations.birthday');
}

/**
 * Build chronological upcoming items in [from, to].
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   from: import('$lib/dates.js').Temporal.PlainDate | string,
 *   to: import('$lib/dates.js').Temporal.PlainDate | string,
 *   includeInactive?: boolean,
 *   terminology: Record<string, string>,
 *   isAdmin?: boolean,
 *   viewerPersonId?: number | null
 * }} opts
 */
export function collectUpcoming(db, opts) {
	const locale = opts.locale || 'en';
	const index = householdIndex(db);
	const knowledgeByPerson = activeKnowledgeMap(db, locale);
	const people = db.prepare('SELECT * FROM people').all();
	const items = [];
	const startPlain = typeof opts.from === 'string' ? Temporal.PlainDate.from(opts.from) : opts.from;
	const viewerPersonId = opts.viewerPersonId ?? null;

	for (const person of people) {
		const inactive =
			person.status !== PERSON_STATUS.ACTIVE ||
			(index.map.get(person.id)?.owner &&
				index.map.get(person.id).owner.status !== PERSON_STATUS.ACTIVE);
		if (inactive && !opts.includeInactive) continue;
		const dates = birthdayOccurrencesInRange(person.birth_date, opts.from, opts.to);
		const meta = annotatePerson(person, index);
		const isMine = Boolean(
			viewerPersonId && (person.id === viewerPersonId || meta.owner?.id === viewerPersonId)
		);
		const isOwnDependent = Boolean(viewerPersonId && meta.owner?.id === viewerPersonId);
		const canSee = Boolean(opts.isAdmin || isMine);
		const canSeeAge = Boolean(opts.isAdmin || isOwnDependent);

		for (const date of dates) {
			const raw = {
				kind: 'birthday',
				person,
				owner: meta.owner,
				relationship: meta.relationship,
				typeLabel: 'Birthday'
			};
			const daysAway = daysBetween(startPlain, date);
			const ageTurning = ageOn(person.birth_date, date);
			const displayName = meta.isMember
				? honorificName(person, opts.terminology)
				: person.full_name;
			items.push({
				id: `bday-${person.id}-${date.toString()}`,
				kind: 'birthday',
				iso: date.toString(),
				sheet: calendarSheet(date, locale),
				dateText: formatDayMonthShort(date, locale),
				weekday: weekdayShort(date, locale),
				daysAway,
				countdown:
					daysAway === 0
						? t(locale, 'home.today')
						: daysAway === 1
							? t(locale, 'home.tomorrow')
							: t(locale, 'home.inDays', { days: daysAway }),
				title: person.full_name,
				displayName,
				context: itemContext(raw, opts.terminology),
				relation: formatRelationForViewer(
					person,
					meta,
					opts.terminology,
					viewerPersonId,
					locale
				),
				turns: canSeeAge ? t(locale, 'home.turns', { age: ageTurning }) : null,
				ageTurning: canSeeAge ? ageTurning : null,
				canSee,
				locked: !canSee,
				isMine,
				trivia: canSee ? (knowledgeByPerson.get(person.id) ?? []) : [],
				phone: canSee ? person.phone || meta.owner?.phone || null : null,
				email: canSee ? person.email || meta.owner?.email || null : null,
				personId: person.id,
				inactive,
				linkable: false
			});
		}
	}

	for (const event of listEvents(db)) {
		if (event.status !== 'ACTIVE') continue;
		const dates = occurrencesInRange(
			{ isoDate: event.iso_date, recurring: Boolean(event.recurring) },
			opts.from,
			opts.to
		);
		for (const date of dates) {
			const daysAway = daysBetween(startPlain, date);
			const localizedTypeLabel = translateEventTypeLabel(
				locale,
				event.type_key,
				event.type_label
			);
			items.push({
				id: `evt-${event.id}-${date.toString()}`,
				kind: 'event',
				iso: date.toString(),
				sheet: calendarSheet(date, locale),
				dateText: formatDayMonthShort(date, locale),
				weekday: weekdayShort(date, locale),
				daysAway,
				countdown:
					daysAway === 0
						? t(locale, 'home.today')
						: daysAway === 1
							? t(locale, 'home.tomorrow')
							: t(locale, 'home.inDays', { days: daysAway }),
				title: event.title,
				typeKey: event.type_key,
				typeLabel: localizedTypeLabel,
				personName: event.person_name || '',
				details: event.details || '',
				recurring: Boolean(event.recurring),
				repeatLabel: event.recurring
					? t(locale, 'home.repeatsAnnually')
					: t(locale, 'home.oneTime'),
				context: itemContext(
					{
						kind: 'event',
						personName: event.person_name,
						typeLabel: localizedTypeLabel
					},
					opts.terminology
				),
				eventId: event.id,
				inactive: false,
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
 * @param {{
 *   upcomingWeeks: number,
 *   terminology: Record<string, string>,
 *   isAdmin: boolean,
 *   viewerPersonId?: number | null
 * }} opts
 */
export function dashboardData(db, opts) {
	const locale = opts.locale || 'en';
	const from = today();
	const to = addWeeks(from, opts.upcomingWeeks);
	const maxLookaheadWeeks = Math.max(opts.upcomingWeeks, 8);
	const maxTo = addWeeks(from, maxLookaheadWeeks);
	const monthStart = Temporal.PlainDate.from({ year: from.year, month: from.month, day: 1 });
	const monthEnd = monthStart.add({ months: 1 }).subtract({ days: 1 });
	const nextMonthStart = monthStart.add({ months: 1 });
	const nextMonthEnd = nextMonthStart.add({ months: 1 }).subtract({ days: 1 });

	const terminology = opts.terminology;
	const activeUpcoming = collectUpcoming(db, {
		from,
		to,
		includeInactive: false,
		terminology,
		isAdmin: opts.isAdmin,
		viewerPersonId: opts.viewerPersonId,
		locale
	});
	const extendedUpcoming = collectUpcoming(db, {
		from,
		to: maxTo,
		includeInactive: false,
		terminology,
		isAdmin: opts.isAdmin,
		viewerPersonId: opts.viewerPersonId,
		locale
	});
	const monthItems = collectUpcoming(db, {
		from: monthStart,
		to: monthEnd,
		includeInactive: false,
		terminology,
		isAdmin: opts.isAdmin,
		viewerPersonId: opts.viewerPersonId,
		locale
	});
	const nextMonthItems = collectUpcoming(db, {
		from: nextMonthStart,
		to: nextMonthEnd,
		includeInactive: false,
		terminology,
		isAdmin: opts.isAdmin,
		viewerPersonId: opts.viewerPersonId,
		locale
	});

	let adminInactive = [];
	if (opts.isAdmin) {
		const all = collectUpcoming(db, {
			from,
			to,
			includeInactive: true,
			terminology,
			isAdmin: true,
			viewerPersonId: opts.viewerPersonId,
			locale
		});
		adminInactive = all.filter((item) => item.inactive);
	}

	const brothers = db
		.prepare(
			`SELECT COUNT(*) AS n
			 FROM users u
			 JOIN people p ON p.id = u.person_id
			 WHERE p.status = 'ACTIVE' AND u.deleted_at IS NULL`
		)
		.get().n;
	const people = db.prepare(`SELECT COUNT(*) AS n FROM people WHERE status = 'ACTIVE'`).get().n;

	return {
		from: from.toString(),
		to: to.toString(),
		maxLookaheadWeeks,
		stats: {
			brothers,
			people,
			currentMonth: monthItems.length,
			nextWindow: activeUpcoming.length,
			nextMonth: nextMonthItems.length
		},
		upcoming: activeUpcoming,
		birthdaysExtended: extendedUpcoming.filter((i) => i.kind === 'birthday'),
		lodgeEvents: extendedUpcoming.filter((i) => i.kind === 'event'),
		adminInactive
	};
}
