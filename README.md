# NEXUS

NEXUS is a community management and analytics platform for Discord servers:
insights about growth and engagement, automations, and moderation tooling in
one dashboard.

> **Status: Phase 2 - Discord sign-in and community selection.** You can sign in
> with Discord, see the servers you can manage and select one. The NEXUS **bot
> does not exist yet** (Phase 3), so a selected server shows an honest "not
> connected" page with no numbers. The only dashboard with data is the public
> **demo** at `/demo`, which runs on generated sample data and says so. See
> [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the roadmap and
> [docs/PROGRESS.md](docs/PROGRESS.md) for exactly what has and has not been
> verified (the real Discord round trip has **not** been exercised yet).

## Stack

Next.js 16 (App Router) - React 19 - TypeScript (strict) - Tailwind CSS v4 -
shadcn/ui - Recharts - Geist (self-hosted) - Zod - Auth.js v5 - Prisma 7 +
PostgreSQL - Vitest - ESLint + Prettier.

## Prerequisites

- Node.js 24 (see `.nvmrc`) and npm 11+
- Docker with Compose v2 (for the local PostgreSQL database)
- A Discord account, to create the OAuth2 application (see below)

## Getting started

```bash
npm install                 # also runs `prisma generate` (postinstall)
cp .env.example .env        # dev-only placeholder values
npm run db:up               # start PostgreSQL in Docker
npm run db:deploy           # apply migrations
# ... create the Discord application and fill in .env (next section) ...
npm run dev                 # http://localhost:3000
```

Without the Discord variables the app still runs: `/demo` works, `/login` says
sign-in is not configured, and every protected page redirects to it. `npm run
build` and `npm test` need neither a database nor Discord credentials.

### Discord application setup

Sign-in needs an OAuth2 application you own. Step by step, in the
[Discord Developer Portal](https://discord.com/developers/applications):

1. Click **New Application**, name it (for example "NEXUS (dev)") and accept the
   terms.
2. Open **OAuth2** in the sidebar.
3. Copy the **Client ID** into `AUTH_DISCORD_ID`.
4. Click **Reset Secret**, copy the **Client Secret** into `AUTH_DISCORD_SECRET`
   (it is shown once; never commit it).
5. Under **Redirects**, add exactly
   `http://localhost:3000/api/auth/callback/discord` and save. Discord matches
   the URL exactly: same scheme, host, port and path, no trailing slash. For
   another host or port add that URL too.
6. Generate the session secret and put it in `AUTH_SECRET`:
   `npx auth secret` (it may write to `.env.local`, which Next.js also reads) or
   `openssl rand -base64 33`.
7. Restart `npm run dev` so the new variables are loaded.

You do not need to select scopes in the portal: the app requests them per
sign-in. NEXUS asks for exactly two:

| Scope      | Why                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------- |
| `identify` | Your user id, username and avatar, to create your NEXUS account.                         |
| `guilds`   | The servers you belong to and your permissions in them, to find the ones you can manage. |

There is no `email` scope: NEXUS never learns your email address. See
[ADR-017](docs/DECISIONS.md#adr-017).

## Environment variables

Copy `.env.example` to `.env`. `.env` is gitignored; never commit secrets.

| Variable                                              | Required | Used by                     | Notes                                                                                                   |
| ----------------------------------------------------- | -------- | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                        | Yes (DB) | Prisma client, `prisma` CLI | `postgresql://` URL. Validated lazily on first DB use.                                                  |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Compose  | `docker-compose.yml`        | Dev defaults exist; keep in sync with `DATABASE_URL`.                                                   |
| `POSTGRES_PORT`                                       | No       | `docker-compose.yml`        | Host port for PostgreSQL (default `5432`). Change it, and the port in `DATABASE_URL`, if 5432 is taken. |
| `AUTH_SECRET`                                         | For auth | Auth.js                     | Session/CSRF signing secret. Generate with `npx auth secret`.                                           |
| `AUTH_DISCORD_ID`                                     | For auth | Auth.js Discord provider    | OAuth2 Client ID.                                                                                       |
| `AUTH_DISCORD_SECRET`                                 | For auth | Auth.js Discord provider    | OAuth2 Client Secret.                                                                                   |
| `AUTH_URL`                                            | Prod     | Auth.js                     | Public URL of the app, e.g. `http://localhost:3000`. Alternative to `AUTH_TRUST_HOST`.                  |
| `AUTH_TRUST_HOST`                                     | Prod     | Auth.js                     | `true` to trust the `Host` header. Needed by `next start` even on localhost (see Troubleshooting).      |
| `NODE_EXTRA_CA_CERTS`                                 | Only if  | Node.js                     | Path to a CA bundle when something intercepts TLS (see Troubleshooting). Not an app variable.           |
| `DISCORD_BOT_TOKEN`                                   | No       | Phase 3 (bot)               | Not used yet; commented out in `.env.example`.                                                          |

Sign-in counts as configured only when `AUTH_SECRET`, `AUTH_DISCORD_ID` and
`AUTH_DISCORD_SECRET` are all set. Auth.js trusts the host automatically in
development (`NODE_ENV` is not `production`), so `npm run dev` on localhost
needs neither `AUTH_URL` nor `AUTH_TRUST_HOST`.

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
volume, healthcheck). Models: `User`, `Account` and `Session` (Auth.js),
`Community` and `CommunityMembership`; see
[docs/DECISIONS.md](docs/DECISIONS.md#adr-018) for the schema decisions.

```bash
npm run db:up                 # start PostgreSQL
npm run db:deploy             # apply committed migrations (safe: never resets)
npx prisma migrate status     # "Database schema is up to date!" when in sync
```

There are two migrations: `20261028000000_init` and `20261028120000_auth`
(additive). Use `db:deploy` to apply them. `db:migrate` (`prisma migrate dev`)
is for creating a new migration while developing and may offer to reset a
database that has drifted: read its prompt before answering.

## Routes

| Route                                                                    | Access    | What it is                                                         |
| ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `/login`                                                                 | Public    | Sign in with Discord; explains the scopes; link to the demo.       |
| `/demo`                                                                  | Public    | The sample-data dashboard (labelled "Demo data").                  |
| `/api/health`, `/api/ready`, `/api/auth/*`                               | Public    | Liveness, readiness, Auth.js endpoints.                            |
| `/`                                                                      | Signed in | Overview of your selected server (or a redirect to `/onboarding`). |
| `/onboarding`                                                            | Signed in | Pick the server to manage.                                         |
| `/analytics`, `/automations`, `/moderation`, `/leaderboard`, `/settings` | Signed in | "Coming soon" pages naming the phase that delivers them.           |

Authorization is always checked on the server (`requireUser()` in each page and
action); see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#authentication-and-authorization).

## Health endpoints

- `GET /api/health` - liveness. Always `200 {"status":"ok",...}`; no database.
- `GET /api/ready` - readiness. Runs `SELECT 1`; `200` when reachable, `503
{"status":"unavailable"}` otherwise. Error details are never returned.

## Testing

`npm test` runs Vitest (`tests/` mirrors `src/`). Database-dependent code is
tested with an in-memory fake of the Prisma client (`tests/helpers/fake-db.ts`)
and Discord is never called: `fetch` is injected. Tests need no PostgreSQL and no
network. Component tests use jsdom and Testing Library; a test file opts in with
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
avatar, chart, dropdown-menu. Details:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#design-system-and-ui).

## App shell

`src/app/(app)/layout.tsx` wraps every page in the shell: skip link, fixed
sidebar (from `lg`), header (page title, the demo-data indicator on `/demo`
only, the account menu or a "Sign in" link, drawer menu button below `lg`) and
the `main` landmark. The nav comes from `src/config/navigation.ts`; only
Overview is available, the other sections are `status: "soon"` and render an
honest "Coming soon" page naming the roadmap phase that delivers them. On
`/demo` the Overview link points at `/demo`.

## Demo mode

`/demo` shows the dashboard (`src/features/dashboard/`) on deterministic
synthetic data: total and active members, messages, new members with
period-over-period change, a 90-day membership chart, a 30-day activity chart
and a recent-activity feed. The data has `source: "demo"` and a persistent "Demo
data - no Discord server connected" banner. Demo numbers are **never** shown for
a real community: `/` renders no figures until live analytics exist (Phase 4).

## Troubleshooting

**Port 5432 is already in use** (`npm run db:up` fails to bind). Another
PostgreSQL is running. Set `POSTGRES_PORT=5433` in `.env` and change the port in
`DATABASE_URL` to match, then `npm run db:up` again.

**`SELF_SIGNED_CERT_IN_CHAIN` (or `unable to get local issuer certificate`)
when signing in or listing servers.** Something between your machine and
discord.com (an antivirus with HTTPS scanning, a corporate proxy) re-signs TLS
traffic with its own root CA, which Node does not trust. The fix is outside the
code: export that root CA as a PEM file and start Node with
`NODE_EXTRA_CA_CERTS=C:\path\to\root-ca.pem`, for example
`NODE_EXTRA_CA_CERTS=/path/to/root-ca.pem npm run dev`. Do **not** disable
certificate verification (`NODE_TLS_REJECT_UNAUTHORIZED=0`): that removes the
protection the OAuth exchange and your tokens rely on.

**`UntrustedHost` (Auth.js error) with `npm start`.** In production mode Auth.js
refuses to guess the host, even on localhost. Set `AUTH_URL=http://localhost:3000`
(or `AUTH_TRUST_HOST=true`) in the environment of `next start`. `npm run dev`
does not need it.

**Discord says "Invalid OAuth2 redirect_uri".** The redirect in the Developer
Portal must match exactly `http://localhost:3000/api/auth/callback/discord`
(port included). If you run on another port, add that URL as well.

**`/login` says sign-in is not configured.** One of `AUTH_SECRET`,
`AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` is missing or empty. Restart the server
after editing `.env`.

**The server list says "Reconnect your Discord account".** The stored Discord
authorization expired or was revoked. Use the button to sign in again.

## Current limitations

- No Discord bot yet (Phase 3, `src/bot/`): a connected server has no data, so
  `/` shows a "not connected" page. There is no real analytics, automation,
  moderation or XP.
- The real Discord round trip (consent, callback, token exchange, guild list,
  token refresh) has not been exercised against Discord; it is covered by tests
  with mocked responses only. See [docs/PROGRESS.md](docs/PROGRESS.md).
- Selecting a server re-checks your permission at that moment. A user who later
  loses Manage Server keeps their NEXUS membership until periodic
  re-verification exists (planned with the bot).
- Discord tokens are stored in plain text in the `accounts` table (Auth.js
  adapter default); encrypting them at rest is future hardening.
- No light theme and no automated accessibility audit.

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In short: `src/app` (thin
routes), `src/features/<name>` (feature modules), `src/components/{ui,layout,common}`,
`src/lib`, `src/server/{db,auth,discord,communities}`, `src/config`, `prisma/`,
`tests/`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Project plan](docs/PROJECT_PLAN.md)
- [Decisions (ADRs)](docs/DECISIONS.md)
- [Progress](docs/PROGRESS.md)
