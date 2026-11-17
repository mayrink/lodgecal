# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: the Lodge admin (Chancellor-equivalent officer) — who maintains people, households, events, event types, users, and Lodge settings.

Secondary users: Lodge Brothers with the USER role. They see the main navigation tabs (Birthdays, My family, Brothers) — the Admin tab is hidden from them. Within their own household they can view and edit their own Person record, view/add/edit their spouse and children, and manage dated birthday notes — but they cannot remove a family member (removal is admin-only), cannot see private family/notes of other households, cannot see sleeping/departed Brothers, and only see `Turns X` (age) for their own spouse and children.

## Product Purpose

LodgeCal replaces a Lodge birthday/event spreadsheet with a self-hosted, dashboard-first information system. It tracks Brothers and their households, birthdays, Masonic milestones (initiation, elevation, exaltation), wedding and Lodge anniversaries, and general Lodge events, then surfaces what's coming up next in a configurable window (default four weeks) so the admin and members always know what's next.

## Positioning

Not a generic calendar-grid app or spreadsheet: a dashboard-first system built specifically around Masonic Lodge relationships and terminology. The household model is deliberately limited (one member, an optional spouse, any number of children — no wider genealogy graph) rather than a general family tree. Initiation, elevation, and exaltation are structurally non-recurring, enforced server-side even against a crafted request, distinguishing real Masonic milestones from ordinary recurring events.

## Operating Context

Single-Lodge, self-hosted deployment — not a multi-tenant SaaS. The Lodge profile (name, number, Obedience, contact info, terminology, theme accent, upcoming-window length) is not hard-coded: it is captured through the first-run `/setup` flow (confirmed in `src/routes/setup/+page.server.js`, which writes the admin's submitted lodge name/number/obedience straight into the `lodge_settings` row) and remains editable afterward by an admin under Lodge/Settings. This lets one running instance serve exactly one real Lodge cleanly while keeping Lodge identity as configuration rather than a rebuild.


LodgeCal is published as open source. Future work should keep this in mind: no real Lodge data, secrets, or personal information belongs in the committed source (the live SQLite database and its WAL/SHM files must stay out of version control), and anything added for a public release (LICENSE, contributor-facing README, issue templates) is a separate later task, not a blocker for current feature work.

## Capabilities and Constraints

- Exactly two roles, ADMIN and USER, enforced in server `load`/`actions`/`hooks.server.js`, not only by hiding navigation.
- People require a mandatory ISO birth date; age is computed on display, never stored, and is visible only to admins (and to a Brother for his own spouse and children).
- Inactive/departed ("sleeping") Brothers and households are retained but hidden from regular users; admins can see and reinstate them.
- "Dated knowledge" birthday notes (e.g., a recent PhD, an artistic talent) are append-only historical records per person with an effective date so greeting writers know how current each note is.
- All date-only logic (birthdays, recurrence, sorting) goes through one Temporal-based utility; birthdays follow an explicit Feb 29 → Feb 28 rule in non-leap years.
- Security: Argon2id password hashing, forced password change at first login, opaque server-side sessions (HttpOnly/SameSite cookies), CSRF protection, failed-login throttling, and an audit log of logins and material changes.
- Regular users (USER role) can create family members and edit their own household, but only an admin can remove one — enforced server-side, not just by hiding a button.
- Regular users can view the active Brothers directory (name, birthday day/month, contact info), but have zero visibility into other Brothers' family members, private notes, ages, or sleeping/departed status.
- The interface language is English today, by the original author's working preference, even though the Lodge this instance serves is Brazilian and the intended eventual language is Brazilian Portuguese. Localization (pt-BR, with English likely kept as a second language) is planned but not yet built — treat any stray non-English string in the current UI as unfinished copy to fix now, not as evidence that i18n has already started.
- Explicitly out of scope for *this build* (not necessarily forever): multi-Lodge tenancy, a full i18n/locale-switching framework, messaging, file/image uploads stored in the app, a public calendar, and a general family tree.

## Brand Commitments

None hard-coded in the codebase. Lodge name, number, Obedience, terminology (e.g. "Bro∴", "Ir∴"), and theme accent color are admin-configurable data captured at setup, not baked-in branding — by explicit design, so the same code serves any single Lodge without a rebuild.

## Evidence on Hand

- `LodgeCall.md` at the project root: the detailed technical/product build brief this implementation follows phase by phase.
- Any live SQLite database under `data/` holds real Lodge data — treat it as production data, never as a fixture to reset casually.
- An earlier prototype (`../old/`), generated via Google AI Studio, using a different stack (Express, sql.js, a Gemini API integration) — superseded by this build; useful only as prior art/reference, not as current source of truth.
- No testimonials, customer studies, or external proof assets; none should be fabricated.

## Product Principles

- Make Lodge administration precise and dependable — this replaces a spreadsheet as the source of truth for dates.
- Keep member relationships and important dates in one place, scoped to one household model on purpose.
- Let members find the next relevant moment quickly, without exposing other households' private details.
- Respect role boundaries everywhere permissions matter, enforced server-side, never just in the UI.
- Keep Lodge identity as configuration, not code, so the app stays a clean single-Lodge tool rather than drifting toward a generic multi-tenant product.

## Accessibility & Inclusion

Light and dark themes via CSS custom properties with a persisted, accessible theme preference; visible focus states; semantic HTML; adequate contrast; `prefers-reduced-motion` respected. Desktop uses a collapsible sidebar; mobile uses an accessible drawer with focus management and touch-appropriate targets.
