import { error } from '@sveltejs/kit';
import '$lib/dates.js';
import { LOCALE_COOKIE, SESSION_COOKIE } from '$lib/constants.js';
import { localizedTerminology, resolveLocale } from '$lib/i18n.js';
import { ensureCsrfCookie, verifyCsrf } from '$lib/server/csrf.js';
import { getDb } from '$lib/server/db.js';
import { isSetupComplete } from '$lib/server/repos/users.js';
import { getLodgeSettings } from '$lib/server/repos/settings.js';
import { getSessionUser } from '$lib/server/sessions.js';

const PUBLIC_PREFIXES = ['/setup', '/login'];
const ADMIN_PREFIXES = ['/admin', '/people', '/events', '/event-types', '/users', '/settings'];

function startsWithAny(path, prefixes) {
	return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const db = getDb();
	event.locals.db = db;
	event.locals.csrf = ensureCsrfCookie(event.cookies);

	const locale = resolveLocale(event.cookies.get(LOCALE_COOKIE));
	event.locals.locale = locale;

	const auth = getSessionUser(db, event.cookies.get(SESSION_COOKIE));
	event.locals.user = auth?.user ?? null;
	event.locals.person = auth?.person ?? null;
	const rawLodge = getLodgeSettings(db);
	event.locals.lodge = rawLodge
		? {
				...rawLodge,
				terminology: localizedTerminology(locale, rawLodge.terminology)
			}
		: null;

	const setupDone = isSetupComplete(db);
	const path = event.url.pathname;

	if (
		path.startsWith('/_app') ||
		path.startsWith('/favicon') ||
		path.startsWith('/robots') ||
		path.startsWith('/images')
	) {
		return resolve(event);
	}

	if (!setupDone && !startsWithAny(path, ['/setup'])) {
		return Response.redirect(new URL('/setup', event.url), 303);
	}

	if (setupDone && startsWithAny(path, ['/setup'])) {
		return Response.redirect(new URL('/login', event.url), 303);
	}

	const contentType = event.request.headers.get('content-type') || '';
	const isFormPost =
		contentType.includes('application/x-www-form-urlencoded') ||
		contentType.includes('multipart/form-data');
	if (!isFormPost && !verifyCsrf(event.request, event.cookies)) {
		error(403, 'Invalid CSRF token.');
	}

	if (setupDone && !startsWithAny(path, PUBLIC_PREFIXES) && path !== '/logout') {
		if (!event.locals.user) {
			return Response.redirect(new URL('/login', event.url), 303);
		}
		if (event.locals.user.mustChangePassword && !startsWithAny(path, ['/change-password'])) {
			return Response.redirect(new URL('/change-password', event.url), 303);
		}
		if (startsWithAny(path, ADMIN_PREFIXES) && event.locals.user.role !== 'ADMIN') {
			error(403, 'Administrator access required.');
		}
	}

	return resolve(event);
}
