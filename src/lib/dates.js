import { Temporal as TemporalPolyfill } from '@js-temporal/polyfill';

export const Temporal = globalThis.Temporal ?? TemporalPolyfill;

/**
 * Parse a YYYY-MM-DD civil date. Never uses JavaScript Date.
 * @param {string} iso
 * @returns {Temporal.PlainDate}
 */
export function plainDate(iso) {
	if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
		throw new Error('Invalid ISO date');
	}
	return Temporal.PlainDate.from(iso);
}

/**
 * Today's civil date in the given IANA time zone (defaults to local/configured timezone).
 * @param {string} [timeZone]
 * @returns {Temporal.PlainDate}
 */
export function today(timeZone) {
	const tz =
		timeZone ||
		process.env.TZ ||
		Intl.DateTimeFormat().resolvedOptions().timeZone ||
		'America/Sao_Paulo';
	return Temporal.Now.plainDateISO(tz);
}

/**
 * Format a PlainDate or ISO string as YYYY-MM-DD.
 * @param {Temporal.PlainDate | string} value
 * @returns {string}
 */
export function toIso(value) {
	if (typeof value === 'string') return plainDate(value).toString();
	return value.toString();
}

/**
 * Age in whole years on a given civil date. Never stored.
 * @param {string} birthIso
 * @param {Temporal.PlainDate | string} [onDate]
 * @returns {number}
 */
export function ageOn(birthIso, onDate = today()) {
	const birth = plainDate(birthIso);
	const on = typeof onDate === 'string' ? plainDate(onDate) : onDate;
	return birth.until(on, { largestUnit: 'years' }).years;
}

/**
 * Next birthday on or after `from`, using Feb 28 in non-leap years for Feb 29 births.
 * @param {string} birthIso
 * @param {Temporal.PlainDate | string} from
 * @returns {Temporal.PlainDate}
 */
export function nextBirthday(birthIso, from) {
	const birth = plainDate(birthIso);
	const start = typeof from === 'string' ? plainDate(from) : from;
	return nextAnnualOccurrence(birth.month, birth.day, start);
}

/**
 * Annual occurrence on or after `from`. Feb 29 shifts to Feb 28 in non-leap years.
 * @param {number} month
 * @param {number} day
 * @param {Temporal.PlainDate | string} from
 * @returns {Temporal.PlainDate}
 */
export function nextAnnualOccurrence(month, day, from) {
	const start = typeof from === 'string' ? plainDate(from) : from;
	let candidate = occurrenceInYear(start.year, month, day);
	if (Temporal.PlainDate.compare(candidate, start) < 0) {
		candidate = occurrenceInYear(start.year + 1, month, day);
	}
	return candidate;
}

/**
 * Occurrence of month/day in a given year. Feb 29 -> Feb 28 in non-leap years.
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {Temporal.PlainDate}
 */
export function occurrenceInYear(year, month, day) {
	if (month === 2 && day === 29 && !isLeapYear(year)) {
		return Temporal.PlainDate.from({ year, month: 2, day: 28 });
	}
	return Temporal.PlainDate.from({ year, month, day });
}

/**
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
	return Temporal.PlainDate.from({ year, month: 1, day: 1 }).inLeapYear;
}

/**
 * All occurrences of an annual event within [from, to] inclusive.
 * Non-recurring events yield at most their own date if it falls in range.
 * @param {{ isoDate: string, recurring: boolean }} event
 * @param {Temporal.PlainDate | string} from
 * @param {Temporal.PlainDate | string} to
 * @returns {Temporal.PlainDate[]}
 */
export function occurrencesInRange(event, from, to) {
	const start = typeof from === 'string' ? plainDate(from) : from;
	const end = typeof to === 'string' ? plainDate(to) : to;
	const origin = plainDate(event.isoDate);

	if (!event.recurring) {
		if (
			Temporal.PlainDate.compare(origin, start) >= 0 &&
			Temporal.PlainDate.compare(origin, end) <= 0
		) {
			return [origin];
		}
		return [];
	}

	const dates = [];
	for (let year = start.year; year <= end.year; year += 1) {
		const occ = occurrenceInYear(year, origin.month, origin.day);
		if (
			Temporal.PlainDate.compare(occ, start) >= 0 &&
			Temporal.PlainDate.compare(occ, end) <= 0
		) {
			dates.push(occ);
		}
	}
	return dates;
}

/**
 * Birthday occurrences in [from, to] inclusive.
 * @param {string} birthIso
 * @param {Temporal.PlainDate | string} from
 * @param {Temporal.PlainDate | string} to
 * @returns {Temporal.PlainDate[]}
 */
export function birthdayOccurrencesInRange(birthIso, from, to) {
	return occurrencesInRange({ isoDate: birthIso, recurring: true }, from, to);
}

/**
 * Add weeks to a civil date.
 * @param {Temporal.PlainDate | string} date
 * @param {number} weeks
 * @returns {Temporal.PlainDate}
 */
export function addWeeks(date, weeks) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return d.add({ days: weeks * 7 });
}

/**
 * Compare two ISO dates or PlainDates. Negative if a < b.
 * @param {Temporal.PlainDate | string} a
 * @param {Temporal.PlainDate | string} b
 * @returns {number}
 */
export function compareDates(a, b) {
	const da = typeof a === 'string' ? plainDate(a) : a;
	const db = typeof b === 'string' ? plainDate(b) : b;
	return Temporal.PlainDate.compare(da, db);
}

const MONTH_ABBR = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

const MONTH_FULL = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const WEEKDAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * @param {Temporal.PlainDate | string} date
 * @returns {{ day: number, monthAbbr: string, iso: string }}
 */
export function calendarSheet(date) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return {
		day: d.day,
		monthAbbr: MONTH_ABBR[d.month - 1],
		iso: d.toString()
	};
}

/**
 * Format as "15 Nov"
 * @param {Temporal.PlainDate | string} date
 * @returns {string}
 */
export function formatDayMonthShort(date) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return `${d.day} ${MONTH_ABBR[d.month - 1]}`;
}

/**
 * Format as "24 November"
 * @param {Temporal.PlainDate | string} date
 * @returns {string}
 */
export function formatDayMonthLong(date) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return `${d.day} ${MONTH_FULL[d.month - 1]}`;
}

/**
 * Format as "15 Nov 2026"
 * @param {Temporal.PlainDate | string} date
 * @returns {string}
 */
export function formatDateShortYear(date) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return `${d.day} ${MONTH_ABBR[d.month - 1]} ${d.year}`;
}

/**
 * Format as "25 December 2026"
 * @param {Temporal.PlainDate | string} date
 * @returns {string}
 */
export function formatDateLongYear(date) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return `${d.day} ${MONTH_FULL[d.month - 1]} ${d.year}`;
}

/**
 * Three-letter weekday ("Mon".."Sun") using Temporal.PlainDate.dayOfWeek (1=Mon..7=Sun).
 * @param {Temporal.PlainDate | string} date
 * @returns {string}
 */
export function weekdayShort(date) {
	const d = typeof date === 'string' ? plainDate(date) : date;
	return WEEKDAY_ABBR[d.dayOfWeek - 1];
}

/**
 * Whole days from `start` to `end` (positive when end > start).
 * @param {Temporal.PlainDate | string} start
 * @param {Temporal.PlainDate | string} end
 * @returns {number}
 */
export function daysBetween(start, end) {
	const s = typeof start === 'string' ? plainDate(start) : start;
	const e = typeof end === 'string' ? plainDate(end) : end;
	return s.until(e, { largestUnit: 'days' }).days;
}

/**
 * Validate a YYYY-MM-DD string as a real civil date.
 * @param {string} iso
 * @returns {boolean}
 */
export function isValidIsoDate(iso) {
	try {
		plainDate(iso);
		return true;
	} catch {
		return false;
	}
}
