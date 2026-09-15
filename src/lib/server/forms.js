import { asString } from './validation.js';

/**
 * @param {FormData} form
 * @param {{ csrf: string }} locals
 * @returns {string | null}
 */
export function csrfError(form, locals) {
	if (asString(form.get('csrf')) !== locals.csrf) return 'Invalid CSRF token.';
	return null;
}

/**
 * @param {FormData} form
 * @param {string} name
 * @returns {number[]}
 */
export function formNumberList(form, name) {
	return form
		.getAll(name)
		.map((v) => Number(asString(v)))
		.filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * Unique slug-like key from a label.
 * @param {string} label
 * @returns {string}
 */
export function slugKey(label) {
	return asString(label)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '')
		.slice(0, 40) || 'event';
}
