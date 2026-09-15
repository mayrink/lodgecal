import { GENDERS, PERSON_STATUS, ROLES } from '../constants.js';
import { isValidIsoDate } from '../dates.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
	return asString(email).toLowerCase();
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
	if (!email) return false;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @param {string} gender
 * @returns {boolean}
 */
export function isValidGender(gender) {
	return Object.values(GENDERS).includes(gender);
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isValidPersonStatus(status) {
	return Object.values(PERSON_STATUS).includes(status);
}

/**
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
	return Object.values(ROLES).includes(role);
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validatePersonInput(input) {
	const fullName = asString(input.fullName ?? input.full_name);
	const gender = asString(input.gender).toUpperCase();
	const birthDate = asString(input.birthDate ?? input.birth_date);
	const emailRaw = asString(input.email);
	const email = emailRaw ? normalizeEmail(emailRaw) : '';
	const phone = asString(input.phone);
	const status = asString(input.status || PERSON_STATUS.ACTIVE).toUpperCase();

	if (!fullName) return { ok: false, error: 'Full name is required.' };
	if (!isValidGender(gender)) return { ok: false, error: 'Gender is required.' };
	if (!birthDate || !isValidIsoDate(birthDate)) {
		return { ok: false, error: 'A valid date of birth (YYYY-MM-DD) is required.' };
	}
	if (email && !isValidEmail(email)) return { ok: false, error: 'Email is invalid.' };
	if (!isValidPersonStatus(status)) return { ok: false, error: 'Invalid status.' };

	return {
		ok: true,
		value: {
			fullName,
			gender,
			birthDate,
			email: email || null,
			phone: phone || null,
			status
		}
	};
}

/**
 * @param {number} weeks
 * @returns {boolean}
 */
export function isValidUpcomingWeeks(weeks) {
	return Number.isInteger(weeks) && weeks >= 1 && weeks <= 52;
}
