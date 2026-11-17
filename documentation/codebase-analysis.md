# LodgeCal Codebase & UI Analysis

> **Status note (2026-11-17):** this document is a point-in-time analysis written before several later changes. Since then: the leftover scaffold in `src/routes/demo/` and `src/lib/vitest-examples/` was removed; UI localization (English, pt-BR, Spanish) was added in `src/lib/i18n.js` and `src/lib/locales/`; a unified `/admin` people registry and a `/brothers` directory were added; all dates go through Temporal; the project moved to pnpm and the AGPL-3.0-or-later license; and `pnpm reset-password <email>` (`scripts/reset-password.js`) provides command-line recovery for locked-out users. Items in sections 4 and 5 below have not all been re-verified; treat them as leads, not current facts.

## 1. Purpose & Core Concept

**LodgeCal** is a self-hosted, single-Lodge web application that replaces a Masonic Lodge’s birthday and milestone spreadsheet. It is designed for the Lodge **Chancellor** (or equivalent officer, `ADMIN` role) and **Lodge Brothers** (`USER` role):

- **Core Goal:** Track Brothers, their immediate households (spouse and children), birthdays, Masonic milestones (*Initiation*, *Elevation*, *Exaltation*), wedding/Lodge anniversaries, and general Lodge events—and surface what is coming up next in a configurable window (default 4 weeks) alongside personal context ("dated knowledge") so the Chancellor and Brothers can prepare meaningful greetings.
- **Deliberately Scoped Household Model:** Every household has **1 User (Lodge Brother)** + **0 or 1 active Spouse** + **0 or more Children** (`src/lib/server/repos/people.js`). It intentionally avoids a general genealogy tree. If a child becomes a Lodge member with their own User account, they are treated as a Brother rather than a dependent (`src/lib/server/upcoming.js`).
- **Strict Role & Privacy Boundaries:**
  - **ADMIN:** Full CRUD over People, Households, Dated Knowledge, Events, Event Types, Users, and Lodge Settings. Only admins see **ages** (computed dynamically, never stored) and **inactive/departed** records.
  - **USER:** Can view the Home dashboard (upcoming birthdays/events without ages or links to other households), view/edit their own profile (`/me`), view/add/edit their own household dependents (`/family` and `/family/[id]`), and manage dated knowledge for their own household. They cannot delete family members or browse any other Brother's record.
- **Dated Knowledge Ledger:** Instead of a single overwritable notes field, personal context (e.g., degrees, achievements, family milestones) is stored as an append-only chronological log per person (`src/lib/server/repos/knowledge.js`).

---

## 2. Architecture & Tech Stack

- **Framework:** SvelteKit 2 + Svelte 5 (Runes mode: `$props`, `$state`, `$derived`, `$effect`) in plain ES2026 JavaScript (no TypeScript, no Tailwind, no UI component libraries), built with `@sveltejs/adapter-node` (`package.json`).
- **Database:** SQLite via `better-sqlite3` in WAL mode (`src/lib/server/db.js`), auto-running SQL migrations from `migrations/` on startup and seeding 7 system event types (`birthday`, `wedding_anniversary`, `lodge_anniversary`, `initiation`, `elevation`, `exaltation`, `general`).
- **Date & Recurrence Engine:** All civil dates (`YYYY-MM-DD`) use `Temporal.PlainDate` (`src/lib/dates.js`) with an explicit **Feb 29 → Feb 28** non-leap-year rule. Server-side validation enforces that *Initiation*, *Elevation*, and *Exaltation* can never recur (`src/lib/server/events.js`).
- **Auth & Security:** Request guard in `src/hooks.server.js` handles first-run redirect to `/setup`, opaque session cookies (`lodgecal_session`), double-submit CSRF tokens, Argon2id password hashing (`src/lib/server/passwords.js`), forced password change on first login (`/change-password`), login throttling, and an `audit_log` table (`src/lib/server/audit.js`).

---

## 3. Current User Interface & Design System

### Aesthetic Direction: *"The Lodge Ledger"* (`DESIGN.md`, `src/app.css`)
- **Palette:** Warm parchment tones (`#f4efe6` background, `#fffdf8` card surface, `#2a2118` deep ink text, `#d9ccb6` tan borders) with a single **Aged Brass** accent (`#8b4513` light / `#c4a574` dark) and a dark mode theme (`html[data-theme='dark']`).
- **Typography:** `Source Serif 4` for headings, brand title, and stat numbers; `Source Sans 3` for body, tables, and inputs; `IBM Plex Mono` for inline code and date pills.
- **Core Components (`src/lib/components/`):**
  - `UpcomingRow.svelte`: The signature "torn desk-calendar day sheet" showing day + month abbreviation alongside the person/event title and relationship context.
  - `FamilyMembers.svelte`: Renders household members with perspective-aware relationship pills (`Spouse`, `Son`, `Daughter`, `Mother`, `Father`, `Brother`, `Sister`).
  - `PersonForm.svelte`: Shared 2-column form grid for person fields.
  - `Icon.svelte` & `Toast.svelte`: Custom 18-glyph stroke icon set and fly-in status toast.

### Screen-by-Screen Map
| Route | Role | Current Layout & UI Pattern |
| :--- | :--- | :--- |
| `src/routes/+layout.svelte` | All | Collapsible left sidebar on desktop (`16.5rem` ↔ `4.25rem` rail), slide-over drawer on `<800px`, theme toggle, user name, logout button. |
| `/` (Home) | All | 4 stat cards (*Active Brothers*, *Active people*, *This month*, *Next N weeks*) + chronological `UpcomingRow` list + dashed Admin panel for inactive/departed items. |
| `/me` | All | Monogram header + 2-column grid (*Personal Details* card + *Household* card) + *Dated knowledge* sortable table + 5 native `<dialog>` modals. |
| `/family` | All | Sortable table of spouse/children + `Add family member` and `Edit` modals (with a link inside the Edit modal to `/family/[id]`). |
| `/family/[id]` | All | Dependent detail view: 2-column grid (*Personal Details* + *Household*) + *Dated knowledge* table + 4 `<dialog>` modals. |
| `/people` | Admin | Sortable table of all people (with Age & Status) + `Add person` button linking to `/people/new`. |
| `/people/new` | Admin | Full-page card form (`PersonForm` + optional household attachment dropdowns). |
| `/people/[id]` | Admin | Admin person profile: 2-column grid (*Personal Details* + *Household* with trash buttons) + *Dated knowledge* table + 5 `<dialog>` modals. |
| `/events` | Admin | Sortable events table + `Add`, `Edit`, and `Archive` `<dialog>` modals. |
| `/event-types` | Admin | Sortable event types table + inline `Add type` card form at the bottom + `Edit` and `Archive` modals. |
| `/users` | Admin | Sortable users table with 4 inline icon actions (*Edit*, *Reset password*, *Archive/Reactivate*, *Delete*) + `use:enhance` modals + temporary password banner. |
| `/settings` | Admin | Single wide form card for Lodge identity, contact info, upcoming window, theme color pickers, and terminology strings. |

---

## 4. UI / UX Issues & Inconsistencies Found

1. **Half-Finished Visual Polish Across Pages:**
   - `/me` received newer UI elements (`.member-monogram` avatar, `<Toast>` notifications, `.ledger-date-pill` on knowledge dates, and `.empty-state-card` with an icon ring), while `/people/[id]` and `/family/[id]`—which display the exact same kind of person sheet—lack the monogram, date pills, and rich empty states.
   - Save feedback is inconsistent: `/me` and `/people/[id]` show `<Toast>`, whereas `/family`, `/family/[id]`, `/events`, `/event-types`, and `/settings` render a plain inline `<p class="muted">Saved.</p>`.
2. **Broken Modal Close Buttons & Dialog Ergonomics:**
   - Because global `button` in `src/app.css` defaults to a solid Aged Brass fill unless `.secondary` is applied, the modal close (`X`) buttons in `/family`, `/family/[id]`, `/events`, `/event-types`, and `/users` omit `.secondary` and render as heavy solid-brass circles instead of subtle ghost icon buttons.
   - Only `/me` and `/people/[id]` close `<dialog>` on backdrop click; dialogs on `/family`, `/family/[id]`, `/events`, `/event-types`, and `/users` ignore backdrop clicks.
   - Modal forms on `/family/[id]`, `/events`, `/event-types`, and `/users` lack a `Cancel` button in `.modal-actions`.
3. **Full-Page Reloads & Hidden Errors on Modal Forms:**
   - Only `/users/+page.svelte` uses SvelteKit’s `use:enhance` to close modals cleanly on success and keep them open on validation error. Every other modal form (`/me`, `/family`, `/family/[id]`, `/people/[id]`, `/events`, `/event-types`) performs a native browser POST—meaning if server validation fails, the page reloads with the modal closed, or if the user re-opens a modal, errors render outside the modal on the parent page.
4. **Inconsistent Page-Level Creation Flows:**
   - Adding a record is different on almost every page: `/people` navigates to a separate `/people/new` route; `/events` and `/family` use a primary text button in `.page-head` to open a modal; `/users` uses a `40x40px` square `+` icon button (`.add-user-button`); and `/event-types` puts a static form card at the bottom of the page below the table.
5. **Missing Household Attachment UI on `/people/[id]`:**
   - The server route `/people/[id]/+page.server.js` loads `heads: listHouseholdHeads(locals.db)` and defines `?/attach` and `?/status` form actions, but `/people/[id]/+page.svelte` never renders a button or form to attach an existing person to a household! If an admin removes someone from a household or creates a person without attaching them initially, there is no UI to attach them later.
6. **Awkward Navigation Between `/me`, `/family`, and `/family/[id]`:**
   - Users can add family members on both `/me` and `/family`.
   - On `/family`, family member names are plain text (not links to `/family/[id]`). To reach a dependent’s dated knowledge from `/family`, the user has to click the `Edit` pencil icon to open the edit modal and click a small `View dated knowledge` link at the bottom of the modal.
7. **Dead Dashboard Rows for Admins & Lack of Filtering/Search:**
   - On the Home dashboard, `UpcomingRow` items are completely static (`linkable: false` in `src/lib/server/upcoming.js`). For an Admin (the Chancellor preparing greetings), clicking an upcoming birthday or event should ideally jump straight to that person’s record/dated knowledge or event details.
   - None of the admin tables (`/people`, `/events`, `/users`) have a search/filter bar or status filter toggle, which becomes essential as the Lodge register grows.

---

## 5. Technical & Backend Bugs Found

1. **Custom Theme Accent Injection Never Works (`src/hooks.server.js` vs `src/app.html`):**
   - `hooks.server.js` looks for `'<html lang="en">'` to inject `--accent` and `--accent-dark`, but `app.html` has `<html lang="en" data-theme="light">`, so `.replace()` never matches. Furthermore, `app.css` defines `--accent` in both `:root` and `html[data-theme='dark']` without referencing `--accent-dark`, so an inline `--accent` style on `<html>` would override dark mode as well.
2. **Soft-Deleted Users Still Counted as Active Brothers (`src/lib/server/upcoming.js`, `src/lib/server/repos/people.js`):**
   - Migration `004_user_deleted_at.sql` added soft-delete (`deleted_at`) to `users`, but several queries forgot `WHERE u.deleted_at IS NULL`:
     - Dashboard `brothers` stat in `upcoming.js` and `countActiveBrothers` in `people.js`.
     - `householdIndex` in `upcoming.js`.
     - `personHasUserAccount`, `getHouseholdForPerson`, and `listHouseholdHeads` in `people.js`.
3. **UTC vs Local Timezone for `today()` (`src/lib/dates.js`):**
   - `today()` defaults to `Temporal.Now.plainDateISO('UTC')`. In Brazil (`America/Sao_Paulo`, UTC-3), after 9:00 PM local time, the dashboard and default knowledge dates roll over to tomorrow's date prematurely.
4. **Unused `event_people` Relational Table & Ignored Seed Data:**
   - `migrations/001_initial.sql` defines `event_people (event_id, person_id)`, and `scripts/seed.js` passes `personIds: [brotherPerson, spouse]` to `createEvent()`, which is silently ignored because events only store a free-text `person_name` string added in migration `003`.
5. **Terminology Gaps (`src/lib/server/repos/settings.js`, `src/lib/display.js`):**
   - `DEFAULT_TERMINOLOGY` defines `worshipful: 'W∴'` and `illustrious: 'Ir∴'`, `/settings` exposes `illustrious` (but not `worshipful`), and `honorificName()` in `display.js` only ever reads `terminology.brother` and `terminology.sister`.
6. **Leftover Scaffold Files:**
   - `src/routes/demo/` and `src/lib/vitest-examples/` are leftover SvelteKit generator files (`/demo` is reachable by any logged-in user).
