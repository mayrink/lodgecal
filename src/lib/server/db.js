import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, 'migrations');

/** @type {Database.Database | null} */
let instance = null;

/**
 * @returns {string}
 */
export function databasePath() {
	return process.env.LODGECAL_DATABASE_PATH || join(ROOT, 'data', 'lodgecal.sqlite');
}

/**
 * @returns {string}
 */
export function nowIso() {
	return new Date().toISOString();
}

/**
 * Open (or reuse) the SQLite database, run migrations, and enable FKs.
 * @param {{ path?: string, migrate?: boolean }} [opts]
 * @returns {Database.Database}
 */
export function getDb(opts = {}) {
	const path = opts.path ?? databasePath();
	const shouldMigrate = opts.migrate !== false;

	if (instance && !opts.path) {
		return instance;
	}

	const dir = dirname(path);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');

	if (shouldMigrate) {
		runMigrations(db);
	}

	if (!opts.path) {
		instance = db;
	}
	return db;
}

/**
 * Close the shared connection (tests).
 */
export function closeDb() {
	if (instance) {
		instance.close();
		instance = null;
	}
}

/**
 * @param {string} [path]
 * @returns {Database.Database}
 */
export function openFreshDb(path) {
	closeDb();
	if (path) {
		process.env.LODGECAL_DATABASE_PATH = path;
	}
	return getDb();
}

/**
 * @param {Database.Database} db
 */
export function runMigrations(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			filename TEXT NOT NULL UNIQUE,
			applied_at TEXT NOT NULL
		);
	`);

	if (!existsSync(MIGRATIONS_DIR)) {
		return;
	}

	const applied = new Set(
		db.prepare('SELECT filename FROM schema_migrations').all().map((row) => row.filename)
	);

	const files = readdirSync(MIGRATIONS_DIR)
		.filter((name) => name.endsWith('.sql'))
		.sort();

	const insert = db.prepare(
		'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)'
	);

	for (const filename of files) {
		if (applied.has(filename)) continue;
		const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
		const apply = db.transaction(() => {
			db.exec(sql);
			insert.run(filename, nowIso());
		});
		apply();
	}

	ensureLodgeSettingsRow(db);
	seedSystemEventTypes(db);
}

/**
 * @param {Database.Database} db
 */
function ensureLodgeSettingsRow(db) {
	const row = db.prepare('SELECT id FROM lodge_settings WHERE id = 1').get();
	if (row) return;
	const ts = nowIso();
	db.prepare(
		`INSERT INTO lodge_settings (
			id, name, number, obedience, contact_email, contact_phone, address,
			terminology_json, theme_json, logo_url, upcoming_weeks, setup_completed,
			created_at, updated_at
		) VALUES (1, 'Lodge', '', '', '', '', '', '{}', '{}', '', 4, 0, ?, ?)`
	).run(ts, ts);
}

const SYSTEM_EVENT_TYPES = [
	{ key: 'birthday', label: 'Birthday', allows: 0, derived: 1 },
	{ key: 'wedding_anniversary', label: 'Wedding anniversary', allows: 1, derived: 0 },
	{ key: 'lodge_anniversary', label: 'Lodge anniversary', allows: 1, derived: 0 },
	{ key: 'initiation', label: 'Initiation', allows: 0, derived: 0 },
	{ key: 'elevation', label: 'Elevation', allows: 0, derived: 0 },
	{ key: 'exaltation', label: 'Exaltation', allows: 0, derived: 0 },
	{ key: 'general', label: 'General event', allows: 1, derived: 0 }
];

/**
 * Idempotent seed of system event types.
 * @param {Database.Database} db
 */
export function seedSystemEventTypes(db) {
	const existing = db.prepare('SELECT key FROM event_types WHERE is_system = 1').all();
	const have = new Set(existing.map((r) => r.key));
	const insert = db.prepare(
		`INSERT INTO event_types (key, label, allows_recurrence, is_system, derived, created_at, updated_at)
		 VALUES (?, ?, ?, 1, ?, ?, ?)`
	);
	const ts = nowIso();
	for (const type of SYSTEM_EVENT_TYPES) {
		if (have.has(type.key)) continue;
		insert.run(type.key, type.label, type.allows, type.derived, ts, ts);
	}
}

/**
 * @template T
 * @param {Database.Database} db
 * @param {() => T} fn
 * @returns {T}
 */
export function transaction(db, fn) {
	return db.transaction(fn)();
}
