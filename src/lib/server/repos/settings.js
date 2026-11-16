import { DEFAULT_UPCOMING_WEEKS } from '../../constants.js';
import { nowIso } from '../db.js';

const DEFAULT_TERMINOLOGY = {
	brother: 'Bro∴',
	sister: 'Sis∴',
	spouse: 'Spouse',
	child: 'Child',
	son: 'Son',
	daughter: 'Daughter',
	worshipful: 'W∴',
	illustrious: 'Ir∴'
};

const DEFAULT_THEME = {
	accent: '#C1912E',
	accentDark: '#E8C86A'
};

/**
 * @param {import('better-sqlite3').Database} db
 */
export function getLodgeSettings(db) {
	const row = db.prepare('SELECT * FROM lodge_settings WHERE id = 1').get();
	if (!row) return null;
	let terminology = { ...DEFAULT_TERMINOLOGY };
	let theme = { ...DEFAULT_THEME };
	try {
		terminology = { ...DEFAULT_TERMINOLOGY, ...JSON.parse(row.terminology_json || '{}') };
	} catch {
		/* keep defaults */
	}
	try {
		theme = { ...DEFAULT_THEME, ...JSON.parse(row.theme_json || '{}') };
	} catch {
		/* keep defaults */
	}
	return {
		id: row.id,
		name: row.name,
		number: row.number,
		obedience: row.obedience,
		contactEmail: row.contact_email,
		contactPhone: row.contact_phone,
		address: row.address,
		terminology,
		theme,
		logoUrl: row.logo_url,
		upcomingWeeks: row.upcoming_weeks || DEFAULT_UPCOMING_WEEKS,
		setupCompleted: Boolean(row.setup_completed)
	};
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object} settings
 */
export function updateLodgeSettings(db, settings) {
	db.prepare(
		`UPDATE lodge_settings SET
			name = ?, number = ?, obedience = ?, contact_email = ?, contact_phone = ?,
			address = ?, terminology_json = ?, theme_json = ?, logo_url = ?, upcoming_weeks = ?,
			updated_at = ?
		 WHERE id = 1`
	).run(
		settings.name,
		settings.number,
		settings.obedience,
		settings.contactEmail,
		settings.contactPhone,
		settings.address,
		JSON.stringify(settings.terminology ?? DEFAULT_TERMINOLOGY),
		JSON.stringify(settings.theme ?? DEFAULT_THEME),
		settings.logoUrl ?? '',
		settings.upcomingWeeks ?? DEFAULT_UPCOMING_WEEKS,
		nowIso()
	);
}

export { DEFAULT_TERMINOLOGY, DEFAULT_THEME };
