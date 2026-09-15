PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lodge_settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	name TEXT NOT NULL DEFAULT 'Lodge',
	number TEXT NOT NULL DEFAULT '',
	obedience TEXT NOT NULL DEFAULT '',
	contact_email TEXT NOT NULL DEFAULT '',
	contact_phone TEXT NOT NULL DEFAULT '',
	address TEXT NOT NULL DEFAULT '',
	terminology_json TEXT NOT NULL DEFAULT '{}',
	theme_json TEXT NOT NULL DEFAULT '{}',
	logo_url TEXT NOT NULL DEFAULT '',
	upcoming_weeks INTEGER NOT NULL DEFAULT 4,
	setup_completed INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	full_name TEXT NOT NULL,
	gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
	birth_date TEXT NOT NULL,
	email TEXT,
	phone TEXT,
	status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPARTED')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_unique
	ON people (email)
	WHERE email IS NOT NULL AND email != '';

CREATE INDEX IF NOT EXISTS idx_people_status ON people (status);
CREATE INDEX IF NOT EXISTS idx_people_birth_date ON people (birth_date);

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	person_id INTEGER NOT NULL UNIQUE REFERENCES people (id),
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
	must_change_password INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS household_memberships (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL REFERENCES users (id),
	person_id INTEGER NOT NULL REFERENCES people (id),
	relationship TEXT NOT NULL CHECK (relationship IN ('SPOUSE', 'CHILD')),
	ended_at TEXT,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	UNIQUE (user_id, person_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_household_user ON household_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_household_person ON household_memberships (person_id);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users (id),
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS event_types (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	key TEXT NOT NULL UNIQUE,
	label TEXT NOT NULL,
	allows_recurrence INTEGER NOT NULL DEFAULT 0,
	is_system INTEGER NOT NULL DEFAULT 0,
	derived INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	event_type_id INTEGER NOT NULL REFERENCES event_types (id),
	title TEXT NOT NULL,
	iso_date TEXT NOT NULL,
	details TEXT NOT NULL DEFAULT '',
	recurring INTEGER NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_iso_date ON events (iso_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events (event_type_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);

CREATE TABLE IF NOT EXISTS event_people (
	event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
	person_id INTEGER NOT NULL REFERENCES people (id),
	PRIMARY KEY (event_id, person_id)
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	person_id INTEGER NOT NULL REFERENCES people (id),
	body TEXT NOT NULL,
	effective_date TEXT NOT NULL,
	author_user_id INTEGER NOT NULL REFERENCES users (id),
	retired INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_person ON knowledge_entries (person_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	actor_user_id INTEGER REFERENCES users (id),
	actor_email TEXT,
	action TEXT NOT NULL,
	entity_type TEXT NOT NULL,
	entity_id TEXT,
	summary TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log (actor_user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email_normalized TEXT NOT NULL,
	success INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
	ON login_attempts (email_normalized, created_at);
