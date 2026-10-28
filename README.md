# NEXUS

NEXUS is a community management and analytics platform for Discord servers:
insights about growth and engagement, automations, and moderation tooling in
one dashboard.

> **Status: Phase 1 - technical foundation.** The project skeleton, database
> schema, tooling and tests are in place. There is **no Discord OAuth and no
> bot yet**; any data shown in the UI will be demo data. See
> [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the roadmap and
> [docs/PROGRESS.md](docs/PROGRESS.md) for what is verified today.

## Stack

Next.js 16 (App Router) - React 19 - TypeScript (strict) - Tailwind CSS v4 -
shadcn/ui - Recharts - Geist (self-hosted) - Zod - Prisma 7 + PostgreSQL - Vitest - ESLint + Prettier.

## Prerequisites

- Node.js 24 (see `.nvmrc`) and npm 11+
- Docker with Compose v2 (only for the local PostgreSQL database)

## Getting started

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # dev-only placeholder values
npm run db:up               # start PostgreSQL in Docker
npm run db:deploy           # apply migrations (see "Database" below)
npm run dev                 # http://localhost:3000
```

The app and `npm run build` work without a database. Only `/api/ready` and
future data-backed pages need one.

## Environment variables

Copy `.env.example` to `.env`. `.env` is gitignored; never commit secrets.

| Variable                                                      | Required | Used by                         | Notes                                                  |
| ------------------------------------------------------------- | -------- | ------------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`                                                | Yes (DB) | Prisma client, `prisma` CLI     | `postgresql://` URL. Validated lazily on first DB use. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`         | Compose  | `docker-compose.yml`            | Dev defaults exist; keep in sync with `DATABASE_URL`.  |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `AUTH_SECRET` | No       | Phase 2 (OAuth2) - not used yet | Commented out in `.env.example`.                       |
| `DISCORD_BOT_TOKEN`                                           | No       | Phase 3 (bot) - not used yet    | Commented out in `.env.example`.                       |

## Scripts

| Script                                      | What it does                                         |
| ------------------------------------------- | ---------------------------------------------------- |
| `npm run dev` / `build` / `start`           | Next.js dev server / production build / serve build  |
| `npm run lint` / `lint:fix`                 | ESLint (flat config, `eslint-config-next`)           |
| `npm run typecheck`                         | `tsc --noEmit`                                       |
| `npm run format` / `format:check`           | Prettier (with Tailwind class sorting)               |
| `npm test` / `test:watch` / `test:coverage` | Vitest                                               |
| `npm run check`                             | lint + typecheck + test (run before pushing)         |
| `npm run db:up` / `db:down`                 | Start / stop the Compose PostgreSQL service          |
| `npm run db:generate`                       | `prisma generate` (also runs on `postinstall`)       |
| `npm run db:migrate`                        | `prisma migrate dev` (create + apply a migration)    |
| `npm run db:deploy`                         | `prisma migrate deploy` (apply committed migrations) |
| `npm run db:studio`                         | Prisma Studio                                        |

## Database

PostgreSQL runs through `docker-compose.yml` (`postgres:17-alpine`, named
volume, healthcheck). The Prisma schema models only `User`, `Community` and
`CommunityMembership`; see [docs/DECISIONS.md](docs/DECISIONS.md#adr-006) for
why.

The initial migration (`prisma/migrations/20261028000000_init`) was generated
without a database via `prisma migrate diff` and **has not been applied to a
running PostgreSQL yet** (see [docs/PROGRESS.md](docs/PROGRESS.md)). Run
`npm run db:deploy` on a fresh database to apply it, and report any problem.

## Health endpoints

- `GET /api/health` - liveness. Always `200 {"status":"ok",...}`; no database.
- `GET /api/ready` - readiness. Runs `SELECT 1`; `200` when reachable, `503
{"status":"unavailable"}` otherwise. Error details are never returned.

## Testing

`npm test` runs Vitest (`tests/` mirrors `src/`). Database-dependent code is
tested with the DB module mocked, so tests need no running PostgreSQL.
Component tests use jsdom and Testing Library; a test file opts in with
`// @vitest-environment jsdom` on its first line (the default environment is
Node).

## Design system

Dark-first, premium gaming look: near-black canvas, charcoal surfaces in
elevation steps, 1px borders, a restrained violet primary and a cyan data
accent. All tokens live in `src/app/globals.css` (shadcn naming: `background`,
`card`, `popover`, `primary`, `muted`, `border`, `chart-1..5`, `sidebar-*`,
plus NEXUS-specific `signal`, `success`, `danger`, `warning`). Components never
use literal colours. Fonts (Geist Sans and Geist Mono) are self-hosted by the
`geist` package, so the build needs no network. Numbers use tabular numerals.
shadcn components in use: button, card, badge, sheet, separator, skeleton,
avatar, chart. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#design-system-and-ui).

## App shell

`src/app/(app)/layout.tsx` wraps every page in the shell: skip link, fixed
sidebar (from `lg`), header (page title, demo-data indicator, a static "Guest"
placeholder, drawer menu button below `lg`) and the `main` landmark. The nav
comes from `src/config/navigation.ts`; only Overview is available, the other
sections are `status: "soon"` and render an honest "Coming soon" page naming
the roadmap phase that delivers them.

## Dashboard demo mode

`/` shows the Overview dashboard (`src/features/dashboard/`) on deterministic
synthetic data: total and active members, messages, new members with
period-over-period change, a 90-day membership chart, a 30-day activity chart
and a recent-activity feed. The data has `source: "demo"`, a persistent
"Demo data - no Discord server connected" banner is shown, and nothing implies
a real server. `getDashboardData()` is the seam a real source replaces in a
later phase.

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In short: `src/app` (thin
routes), `src/features/<name>` (feature modules), `src/components/{ui,layout,common}`,
`src/lib`, `src/server/db`, `src/config`, `prisma/`, `tests/`.

## Current limitations

- Demo data only: no Discord OAuth2 sign-in, no real communities.
- No Discord bot process (planned for Phase 3, `src/bot/`).
- No authentication or authorization yet; only the health endpoints exist.
- Initial migration not yet applied/verified against a live database.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Project plan](docs/PROJECT_PLAN.md)
- [Decisions (ADRs)](docs/DECISIONS.md)
- [Progress](docs/PROGRESS.md)
