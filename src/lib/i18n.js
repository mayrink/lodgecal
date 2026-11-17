import { DEFAULT_LOCALE } from './constants.js';

const modules = import.meta.glob('./locales/*.json', { eager: true });

/** @type {Record<string, Record<string, any>>} */
const DICTIONARIES = {};

/** @type {Array<{ code: string, name: string, short: string, flag: string }>} */
const discoveredLocales = [];

for (const [path, mod] of Object.entries(modules)) {
	const data = mod.default ?? mod;
	const fileCode = path.split('/').pop()?.replace(/\.json$/, '') || '';
	const meta = data?._meta ?? {};
	const code = meta.code || fileCode;
	if (!code) continue;
	DICTIONARIES[code] = data;
	discoveredLocales.push({
		code,
		name: meta.name || code,
		short: meta.short || code.slice(0, 2).toUpperCase(),
		flag: meta.flag || code.toLowerCase()
	});
}

const PRIORITY_ORDER = ['pt-BR', 'en', 'es'];

export const LOCALES = Object.freeze(
	discoveredLocales.sort((a, b) => {
		const ia = PRIORITY_ORDER.indexOf(a.code);
		const ib = PRIORITY_ORDER.indexOf(b.code);
		if (ia !== -1 && ib !== -1) return ia - ib;
		if (ia !== -1) return -1;
		if (ib !== -1) return 1;
		return a.name.localeCompare(b.name);
	})
);

/**
 * Validate or normalize a locale code, defaulting to DEFAULT_LOCALE ('pt-BR').
 * @param {string | null | undefined} code
 * @returns {string}
 */
export function resolveLocale(code) {
	if (!code) return DEFAULT_LOCALE;
	if (DICTIONARIES[code]) return code;
	const lower = String(code).toLowerCase();
	const match = LOCALES.find(
		(l) => l.code.toLowerCase() === lower || l.code.toLowerCase().startsWith(`${lower}-`)
	);
	return match ? match.code : DEFAULT_LOCALE;
}

/**
 * Get nested value from a dictionary by dotted path (e.g. 'nav.birthdays').
 * @param {Record<string, any> | undefined} dict
 * @param {string} path
 * @returns {string | undefined}
 */
function lookupPath(dict, path) {
	if (!dict) return undefined;
	let cur = dict;
	for (const part of path.split('.')) {
		if (cur == null || typeof cur !== 'object') return undefined;
		cur = cur[part];
	}
	return typeof cur === 'string' ? cur : undefined;
}

/**
 * Translate a dotted key in `locale`, with fallback to `pt-BR` then `en`, and interpolate `{param}`.
 * @param {string} locale
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(locale, key, params = {}) {
	const resolved = resolveLocale(locale);
	const raw =
		lookupPath(DICTIONARIES[resolved], key) ??
		lookupPath(DICTIONARIES[DEFAULT_LOCALE], key) ??
		lookupPath(DICTIONARIES.en, key) ??
		key;

	return raw.replace(/\{(\w+)\}/g, (_, token) =>
		params[token] !== undefined && params[token] !== null ? String(params[token]) : `{${token}}`
	);
}

/**
 * Create a bound translator `(key, params) => string` for a locale.
 * @param {string} locale
 */
export function createTranslator(locale) {
	const resolved = resolveLocale(locale);
	return (key, params = {}) => t(resolved, key, params);
}

/**
 * Translate system event types by key while preserving custom category labels.
 * @param {string} locale
 * @param {string | undefined} typeKey
 * @param {string} fallbackLabel
 * @returns {string}
 */
export function translateEventTypeLabel(locale, typeKey, fallbackLabel) {
	if (!typeKey) return fallbackLabel;
	const resolved = resolveLocale(locale);
	const fromDict = lookupPath(DICTIONARIES[resolved], `eventTypes.${typeKey}`);
	if (fromDict && ( fallbackLabel === lookupPath(DICTIONARIES.en, `eventTypes.${typeKey}`) || fallbackLabel === 'General event' || fallbackLabel === 'Other' || ['birthday', 'initiation', 'elevation', 'exaltation', 'wedding_anniversary', 'lodge_anniversary', 'general'].includes(typeKey) )) {
		return fromDict;
	}
	return fallbackLabel;
}

const STOCK_DEFAULTS = {
	brother: new Set(['Bro∴', 'Ir∴', 'H∴']),
	sister: new Set(['Sis∴', 'Ir∴', 'H∴']),
	spouse: new Set(['Spouse', 'Cônjuge', 'Cónyuge']),
	child: new Set(['Child', 'Filho(a)', 'Hijo(a)']),
	son: new Set(['Son', 'Filho', 'Hijo']),
	daughter: new Set(['Daughter', 'Filha', 'Hija']),
	worshipful: new Set(['W∴', 'V∴']),
	illustrious: new Set(['Ir∴', 'Il∴'])
};

/**
 * Localize stock terminology to the active locale while respecting custom admin overrides.
 * @param {string} locale
 * @param {Record<string, string>} [stored]
 * @returns {Record<string, string>}
 */
export function localizedTerminology(locale, stored = {}) {
	const resolved = resolveLocale(locale);
	const dictTerms = DICTIONARIES[resolved]?.terms ?? DICTIONARIES[DEFAULT_LOCALE]?.terms ?? {};
	const out = { ...dictTerms, ...stored };
	for (const [k, stockSet] of Object.entries(STOCK_DEFAULTS)) {
		if (!stored[k] || stockSet.has(stored[k])) {
			out[k] = dictTerms[k] || stored[k];
		}
	}
	return out;
}
