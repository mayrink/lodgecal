export const ROLES = Object.freeze({
	ADMIN: 'ADMIN',
	USER: 'USER'
});

export const GENDERS = Object.freeze({
	MALE: 'MALE',
	FEMALE: 'FEMALE',
	OTHER: 'OTHER'
});

export const RELATIONSHIPS = Object.freeze({
	SPOUSE: 'SPOUSE',
	CHILD: 'CHILD'
});

export const PERSON_STATUS = Object.freeze({
	ACTIVE: 'ACTIVE',
	INACTIVE: 'INACTIVE',
	DEPARTED: 'DEPARTED'
});

export const EVENT_STATUS = Object.freeze({
	ACTIVE: 'ACTIVE',
	ARCHIVED: 'ARCHIVED'
});

export const NON_RECURRING_EVENT_TYPE_KEYS = Object.freeze([
	'initiation',
	'elevation',
	'exaltation'
]);

export const SYSTEM_EVENT_TYPE_KEYS = Object.freeze([
	'birthday',
	'wedding_anniversary',
	'lodge_anniversary',
	'initiation',
	'elevation',
	'exaltation',
	'general'
]);

export const DEFAULT_UPCOMING_WEEKS = 4;

export const SESSION_COOKIE = 'lodgecal_session';
export const CSRF_COOKIE = 'lodgecal_csrf';
export const LOCALE_COOKIE = 'lodgecal_locale';
export const DEFAULT_LOCALE = 'pt-BR';

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 8;

export const TEMP_PASSWORD_BYTES = 18;
