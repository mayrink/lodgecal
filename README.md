# LodgeCal

Self-hostable Lodge information dashboard for birthdays, household events, and dated personal knowledge. Built with SvelteKit 2 (Svelte 5 runes), plain JavaScript, SQLite, and Temporal civil dates.

## Requirements

- Node.js 22+
- npm 10+

## Local setup

```bash
npm install
```

Optional environment (see `.env.example`):

```bash
LODGECAL_DATABASE_PATH=data/lodgecal.sqlite
ORIGIN=http://localhost:5173
```

The SQLite file is created outside `static/` on first run. Migrations run automatically when the app starts.

```bash
# Apply migrations only
npm run migrate

# Development server
npm run dev
```

On first visit, complete `/setup` to create the Lodge profile and the initial administrator. That administrator must change the password before using the rest of the app.

Idempotent demo seed (skips if any user already exists):

```bash
npm run seed
```

Demo accounts after seeding:

- `admin@example.com` / `ChangeMe-demo-1`
- `georges@example.com` / `ChangeMe-demo-1`
- `leap@example.com` / `ChangeMe-demo-1` (must change password)

## Tests

```bash
npm run test:unit
npx playwright install --with-deps
npm run test:e2e
```

Focused coverage includes Temporal birthday/recurrence (Feb 29 → Feb 28), permission boundaries, forced temporary-password change, and server refusal of recurring initiation/elevation/exaltation.

## Production build

```bash
npm run build
ORIGIN=http://localhost:3000 node build
```

Uses `@sveltejs/adapter-node`. Keep `data/*.sqlite` and secrets off the public static path. Set `ORIGIN` to the public URL.

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
| `@playwright/test` | End-to-end smoke tests |
| `vite` | Dev/build |

No TypeScript application source, Tailwind, or component kits.

## Roles

- **USER**: dashboard, own Person record, own spouse/children, household dated knowledge.
- **ADMIN**: people, households, events, event types, users, Lodge settings, inactive/departed records.

Permissions are enforced in server `load`/`actions` and `hooks.server.js`, not only by hiding navigation.
