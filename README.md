<div align="center">

# LodgeCal

**A self-hosted dashboard for Masonic Lodge birthdays, households, and milestones.**

Replace the Lodge spreadsheet with one dependable source of truth, and always know what is coming up next.

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-ff3e00?logo=svelte&logoColor=white)](https://svelte.dev)
[![Svelte 5](https://img.shields.io/badge/Svelte-5%20runes-ff3e00)](https://svelte.dev)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003b57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![pnpm](https://img.shields.io/badge/pnpm-12-f69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Plain JavaScript](https://img.shields.io/badge/JavaScript-no%20TypeScript-f7df1e?logo=javascript&logoColor=black)](#stack)

</div>

---

## Why LodgeCal?

Most Lodges track birthdays, anniversaries, and Masonic milestones in a spreadsheet that one person maintains and nobody else can trust. LodgeCal is built specifically for that job:

- **Dashboard first, not a calendar grid.** Open the app and see the next birthdays and events in a configurable window (four weeks by default).
- **Made for Lodge life.** Initiation, elevation, exaltation, wedding anniversaries, and Lodge anniversaries are first-class, and the first three are structurally non-recurring.
- **One Lodge, your identity.** Name, number, Obedience, terminology (for example *Bro∴* / *Ir∴*), and accent colors are configuration captured at setup, never hard-coded.
- **Privacy by design.** Brothers see only what they should. Permissions are enforced on the server, not just by hiding buttons.
- **Yours to host.** A single Node process and one SQLite file. No SaaS, no third-party services, no tracking.

## Features

| | |
| --- | --- |
| **Upcoming dashboard** | Birthdays, anniversaries, and events in a rolling window, with stat cards for the month and the window ahead. |
| **Households** | Each Brother has one household: an optional spouse and any number of children. Deliberately not a family tree. |
| **Dated knowledge** | An append-only, dated log of personal context (a new degree, an artistic talent) so greetings are always current. |
| **Event types** | Seven built-in types plus your own, with a server-enforced rule that milestones never recur. |
| **Sleeping and departed Brothers** | Retained in the database but hidden from regular users. Admins can see and reinstate them. |
| **Roles** | `ADMIN` manages everything. `USER` manages only their own household. |
| **Multilingual UI** *(in progress)* | English, Português (Brasil), and Español. Translation files are in place; some screens still need their strings moved over. Help welcome. |
| **Light and dark themes** | Warm "Lodge Ledger" design with accessible focus states, reduced-motion support, and a mobile drawer. |
| **Audit log** | Logins and material changes are recorded. |

### Security

Argon2id password hashing, forced password change on first login, opaque server-side sessions (HttpOnly, SameSite cookies), CSRF protection, failed-login throttling, and server-side authorization in every `load` and `action`.

### Date handling

Every business date goes through a single [Temporal](https://tc39.es/proposal-temporal/)-based utility (`Temporal.PlainDate`, never `Date`). Birthdays on **Feb 29** are celebrated on **Feb 28** in non-leap years. Ages are computed on display and never stored.

## Quick start

**Requirements:** Node.js 22 or newer and [pnpm](https://pnpm.io) 12.

```bash
git clone <your-repo-url> lodgecal
cd lodgecal
pnpm install
pnpm dev
```

Open the printed URL. On first visit you land on `/setup`, where you create the Lodge profile and the initial administrator, who must change their password before continuing.

The administrator you create here is the owner of the installation. After setup, the admin can change their own details under **My profile**, edit any person or household under **People**, and reset any user's password under **Users**. Nothing about the first account is hard-coded.

**Locked out?** Anyone with shell access to the server can reset a password from the command line:

```bash
pnpm reset-password admin@yourlodge.org            # prints a random temporary password
pnpm reset-password admin@yourlodge.org 'my-new-passphrase'
```

The user must choose a new password at next login, existing sessions are ended, and the reset is recorded in the audit log.

Want to explore with sample data first?

```bash
pnpm seed
```

| Account | Password |
| --- | --- |
| `admin@example.com` | `ChangeMe-demo-1` |
| `john@example.com` | `ChangeMe-demo-1` |
| `leap@example.com` | `ChangeMe-demo-1` (must change on first login) |

The seed is idempotent and skips itself if any user already exists. Never seed a production database.

## Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LODGECAL_DATABASE_PATH` | `data/lodgecal.sqlite` | Location of the SQLite file. |
| `ORIGIN` | `http://localhost:5173` | Public URL of the app. Required in production for CSRF checks. |

The database is created on first run and migrations in `migrations/` are applied automatically at startup. To apply them without starting the app, run `pnpm migrate`.

## Production

```bash
pnpm build
ORIGIN=https://lodge.example.org node build
```

The app uses `@sveltejs/adapter-node`. Put it behind a reverse proxy that terminates TLS, set `ORIGIN` to the public URL, and back up the `data/` directory (the `.sqlite` file and its `-wal` / `-shm` companions) regularly.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the development server. |
| `pnpm build` | Build the production bundle. |
| `pnpm start` | Run the production build (`node build`). |
| `pnpm preview` | Preview the production build locally. |
| `pnpm migrate` | Apply database migrations only. |
| `pnpm seed` | Load demo data into an empty database. |
| `pnpm reset-password <email>` | Reset a user's password from the command line. |
| `pnpm test:unit` | Run Vitest unit tests. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |
| `pnpm test` | Run both. |

For the first end-to-end run, install the browsers with `pnpm exec playwright install --with-deps`.

## Stack

| Package | Role |
| --- | --- |
| `svelte` 5 | UI, runes mode |
| `@sveltejs/kit` 2 | App framework |
| `@sveltejs/adapter-node` | Self-hosted Node adapter |
| `better-sqlite3` | SQLite with prepared statements |
| `argon2` | Argon2id password hashing |
| `@js-temporal/polyfill` | Temporal civil dates |
| `vitest` | Unit tests |
| `@playwright/test` | End-to-end tests |
| `vite` | Dev server and bundler |

Application code is plain JavaScript (`.js` and `.svelte`) with plain CSS and custom properties. There is no TypeScript, Tailwind, or component kit, by design.

## Project layout

```
src/
  lib/            shared code: dates, i18n, constants, components, locales
  lib/server/     database, auth, sessions, CSRF, audit, repositories
  routes/         pages and server actions (admin, brothers, events, family, me, people, settings, users, ...)
migrations/       ordered SQL migrations
scripts/          migrate and seed scripts
e2e/              Playwright tests
documentation/    codebase notes
```

See [`PRODUCT.md`](PRODUCT.md) for product intent and constraints, and [`DESIGN.md`](DESIGN.md) for the design system.

## Contributing

Contributions are welcome: bug reports, translations, and pull requests. Before opening a pull request:

1. Run `pnpm test` and make sure it passes.
2. Keep to the stack rules above (plain JavaScript, Svelte 5 runes, Temporal for dates).
3. Never commit real Lodge data, secrets, or database files. `data/*.sqlite*` and `.env` are git-ignored for a reason.

## License

LodgeCal is free software under the [GNU Affero General Public License v3.0 or later](LICENSE), with additional attribution terms described in [`NOTICE.md`](NOTICE.md).

In short:

- You may use, study, modify, and share it, including offering it as a hosted service.
- You must **credit the original project and author** and keep the copyright notices.
- If you distribute a modified version, or run one for others over a network, you must publish your **complete source code under the same license**. It cannot be closed-source.
- Improvements are very welcome as pull requests.
- Need different terms, such as embedding it in a proprietary product? A **commercial license** is available. See [`NOTICE.md`](NOTICE.md).

Copyright &copy; 2026 Georges Mayrink.
