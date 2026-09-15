import { randomBytes } from 'node:crypto';
import { CSRF_COOKIE } from '../constants.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * @returns {string}
 */
export function createCsrfToken() {
	return randomBytes(32).toString('hex');
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @returns {string}
 */
export function ensureCsrfCookie(cookies) {
	const existing = cookies.get(CSRF_COOKIE);
	if (existing) return existing;
	const token = createCsrfToken();
	cookies.set(CSRF_COOKIE, token, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
	});
	return token;
}

/**
 * @param {Request} request
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @returns {boolean}
 */
export function verifyCsrf(request, cookies) {
	if (SAFE_METHODS.has(request.method)) return true;
	const cookieToken = cookies.get(CSRF_COOKIE);
	if (!cookieToken) return false;

	const header = request.headers.get('x-csrf-token');
	if (header && timingSafeEqual(header, cookieToken)) return true;

	return false;
}

/**
 * Compare two strings in roughly constant time.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
	if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
		return false;
	}
	let out = 0;
	for (let i = 0; i < a.length; i += 1) {
		out |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return out === 0;
}
