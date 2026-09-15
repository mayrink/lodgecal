Build a complete, self-hostable web application named LodgeCal. Work in small verified phases and preserve the existing repository unless a change is necessary. Before coding, inspect the repository and report any existing constraints. After each phase, run the relevant checks and report concise results. Do not claim a check passed unless you ran it.

## Absolute technology rules — no exceptions

- Use Svelte 5 in Runes mode and SvelteKit 2.
- Write application source only in plain JavaScript/ECMAScript 2026: `.js` and `.svelte` files.
- Use SQLite with migrations and server-only database access. On the first run, create and initialize the SQLite database from the current migrations before completing first-run administrator setup. Prefer explicit prepared statements/repository modules rather than an ORM.
- Use the SvelteKit Node adapter for a self-hosted Node deployment.
- Use plain CSS, scoped Svelte styles, CSS custom properties, and reusable Svelte components.
- Use Temporal for every date-only calculation, birthday calculation, annual occurrence, and recurrence rule. Use `Temporal.PlainDate`, not JavaScript `Date`, for `YYYY-MM-DD` business dates. Centralize it in a date utility. Provide a maintained JavaScript Temporal polyfill fallback where native Temporal is unavailable.

NEVER introduce TypeScript, `.ts`, `.d.ts`, `lang="ts"`, Tailwind CSS, PostCSS Tailwind plugins, shadcn-svelte, Skeleton, Flowbite, DaisyUI, React, Next.js, JSX, Vue, Angular, Material UI, SMUI, or a Material Design aesthetic. Do not silently replace these requirements with a preferred stack. Do not store images/PDFs/files in SQLite.

## Product

LodgeCal replaces a Lodge birthday/event spreadsheet. It is a dashboard-first Lodge information system, not a calendar-grid app. It must be generic: Lodge identity, Obedience, terminology, theme accents, and an optional logo URL/static asset reference are configuration, never hard-coded. The Lodge profile includes name, number, Obedience (e.g. GLESP/GOP/GOSP), contact information, terminology, theme settings, and an administrator-configurable dashboard upcoming-window length in weeks (default 4). Do not implement logo file upload in v1 and never store binary assets in SQLite.

## People and household model — deliberately limited

Maintain People with full name, explicit gender, mandatory ISO birth date, optional email, optional phone, lifecycle status, and timestamps. A Person cannot be created without a valid date of birth. Age is calculated on display; never stored, and is visible only to administrators. Regular Users must never see ages. Never store a derived MM/DD column. Email is mandatory for a User because it is the User’s login identifier; family members may have an email address for contact/future use without having an account.

A User household is exactly: one User, zero or one spouse, and zero or more children. Every Person has an explicit gender. A spouse can be any gender. Never infer gender from a relation. Use only `SPOUSE` and `CHILD` relationship values internally; terminology decides how the UI presents those relationships and Lodge-specific forms of address. Enforce no more than one active spouse per User.

Do NOT build a genealogy graph, cross-household associations, grandparents, grandchildren, cousins, or shared family-person records. A Person who becomes a User/Lodge member is greeted once as a User; do not also display that Person as another User’s child. This simplification is intentional.

Inactive and departed Brothers and their households remain retained in the database but are hidden from regular users and excluded from their normal upcoming list. Administrators can see them, clearly marked, and manage/reinstate their status. Regular users cannot delete/archive people. There is no in-app deletion-request feature. For administrator corrections/divorce, implement a confirmed administrator-only archive/end-relationship action rather than routine destructive deletion.

## Roles, login, and privacy

There are exactly two roles: ADMIN and USER.

- ADMIN can manage everything: people, households, dated knowledge, events, event types, users, Lodge settings, and lifecycle status. Admin-only sidebar entries must not appear for regular Users.
- USER can use the dashboard, view/edit only their own Person record, view/edit only their own spouse and children, and add/view dated knowledge for their own household. He cannot browse any other Brother’s private details/family pages, manage configuration/events/users, see inactive/departed households, delete/archive records, or submit deletion requests.

Enforce all permissions in server-side load/action/API code. Hidden navigation alone is never authorization.

Accounts log in using the unique, case-normalized email address stored on the User’s Person record. When an admin creates an account, generate a cryptographically secure random temporary password with a server RNG; never use phone numbers as passwords. Hash passwords with Argon2id (or an equally maintained secure password hash), force a password change at first login, and use opaque server-side sessions in secure HttpOnly SameSite=Lax cookies. Implement CSRF protection for state changes, prepared SQLite statements, input validation, generic login failures, and basic failed-login throttling. Record successful and failed login attempts in the audit log without passwords or secrets, and record all material changes made by users in the audit log with actor, action, affected entity, timestamp, and a non-sensitive before/after summary.

## Dated knowledge entries

The Chancellor needs reusable personal context for greetings, such as a person’s recent PhD or artistic talent. This is NOT one notes textarea. Each entry is an independent historical record: person, free-form text, automatically populated effective date (default today), author, creation timestamp, and optional retired state. Show reverse-chronological history. Do not overwrite previous entries. Brothers can add entries only for themselves/their own household; admin can correct them.

## Birthdays and events

Birthdays are derived from people’s birth dates and recur yearly. Use Temporal only. Decide and test an explicit February 29 rule: show the birthday on February 28 in non-leap years.

Administrators manage configurable event types and events. An event has type, title, ISO date, optional related person(s), details, lifecycle, and recurrence. The recurrence toggle is available only for types that allow it. Wedding anniversaries and Lodge anniversaries may recur annually. Initiation, Elevation, and Exaltation are always non-recurring: enforce this on the server even for crafted requests. Non-recurring events appear only on their actual date. Seed sensible system types: birthday (derived/read-only), wedding anniversary, Lodge anniversary, initiation, elevation, exaltation, and general event.

Use one tested Temporal recurrence utility for all occurrence queries and sorting. Never use `new Date('YYYY-MM-DD')`, timezone conversions, or stored MM/DD fields for civil-date recurrence.

## Dashboard and UX

The home page is a dashboard, not a calendar. It has concise statistic cards for active Brothers, active people, current-month items, and next-month/next-four-week items. Below that, show a prominent chronological Upcoming Birthdays & Events list covering the administrator-configured number of upcoming weeks; default to 4 weeks.

Each list row must be a horizontal, scannable item: at left a small calendar-sheet block with the day above abbreviated month; at right two lines: person/event title and concise relationship/event context. Examples: “Spouse of Ir∴ Georges Mayrink”, “Daughter of Bro∴ …”, or the event’s related-person context. A regular user can see a public upcoming item but must not get a link that exposes another household’s private detail page. Administrators may see inactive/departed items in a visually distinct administrative section.

Use a desktop collapsible sidebar. Regular links: Home, My Details, My Family. Admin links: Home, People, Events, Event Types, Users, Lodge/Settings. On mobile, use an accessible drawer/menu with focus management and sensible touch targets.

The design must be clean, warm, professional, responsive, information-dense, and closer to Semantic/Fomantic UI than Material. Implement light and dark modes using CSS custom properties, an accessible persisted theme preference, visible focus states, semantic HTML, adequate contrast, and `prefers-reduced-motion`. Use subtle microinteractions only: button press feedback, refined hovers, gentle sidebar/modal transitions, and restrained icon animation. Never make it look like a generic Tailwind/Material SaaS template.

## Suggested SQLite entities

Implement migrations and foreign keys for Lodge settings, people, household memberships, users, sessions, event types, events, person knowledge entries, and an audit log. Every User must reference exactly one Person, and that Person’s email is the login identifier; do not duplicate the email in the users table. The audit log must record logins (successful and failed) and material changes made by all users, without storing passwords, tokens, or other secrets. Add essential unique constraints, timestamps, transactional writes, and indexes for upcoming-date queries. Keep the database and secrets outside static public paths. Do not include any file/blob storage.

## Required quality bar

1. Build and run the app successfully.
2. On first run, create and initialize the SQLite database from migrations, then supply first-run setup that creates the initial admin and forces its password change.
3. Seed system event types and representative non-sensitive demo data only when useful; make seeding idempotent or clearly separated from production setup.
4. Add focused tests for Temporal birthday/recurrence behavior (including Feb 29), permission boundaries, forced temporary-password change, and server enforcement that initiation/elevation/exaltation cannot recur.
5. Add a small end-to-end smoke test for login and dashboard where practical.
6. Verify responsive desktop and mobile layouts, dark/light modes, keyboard navigation, and reduced motion.
7. Finish with clear local setup/run/migrate/test/deploy instructions and list every dependency added.

## Delivery phases for a 10K-token daily allowance

Do not attempt the entire app in one response. Stop cleanly at phase boundaries and wait for the next request if close to the daily limit.

Phase 1: JavaScript-only scaffold, Node adapter, SQLite migrations/repositories, Temporal utility/polyfill boundary, auth/session/roles, first-run admin, initial tests.
Phase 2: people/households/knowledge CRUD, privacy enforcement, admin user management, tests.
Phase 3: events/event types/recurrence, dashboard, Lodge settings, full responsive UI and theming.
Phase 4: test, accessibility/security pass, documentation, deployment verification, bug fixes.

Before each phase, restate the files/features you will touch in a short checklist. At the end, provide the actual command results, changed-file summary, known limitations, and the exact next phase. Do not broaden the scope to messaging, card-file uploads, a public calendar, a general family tree, i18n, licensing, or multi-Lodge tenancy.
