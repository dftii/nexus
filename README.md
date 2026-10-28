# NEXUS

NEXUS is a community management and analytics platform for Discord servers:
insights about growth and engagement, automations, and moderation tooling in
one dashboard.

> **Status: Phase 4 - Analytics from real events (implemented, live check
> pending).** You can sign in with Discord, select a server you manage, invite
> the NEXUS bot to it and run the bot as a second process. The Overview shows the
> bot status (not installed / offline / online) and **real** message metrics, and
> `/analytics` shows daily messages and active authors, a channel table and an
> hour x weekday heatmap for 7, 30 or 90 days. Everything is built only from
> message metadata the bot stores; message text is never read. The bot rolls the
> events up into daily totals and deletes raw events past the retention window
> only after those totals are verified. The public **demo** at `/demo` is the
> only dashboard with generated sample data and says so. Phase 5 (automations) is
> next. See [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) and
> [docs/PROGRESS.md](docs/PROGRESS.md) for exactly what has and has not been
> verified: agents never start the live bot, so the aggregation, retention and
> analytics page against a real server still need the manual check described in
> the [bot README](src/bot/README.md#analytics-maintenance-phase-4).

## Stack

Next.js 16 (App Router) - React 19 - TypeScript (strict) - Tailwind CSS v4 -
shadcn/ui - Recharts - Geist (self-hosted) - Zod - Auth.js v5 - Prisma 7 +
PostgreSQL - discord.js 14 (bot process, run with tsx) - Vitest - ESLint +
Prettier.

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

To collect real activity, run the bot as a **second process** in another terminal
(see [Running the bot](#running-the-bot)):

```bash
npm run bot:dev             # needs DISCORD_BOT_TOKEN and DISCORD_GUILD_ALLOWLIST
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
| `DISCORD_BOT_TOKEN`                                   | For bot  | Bot process only            | Developer Portal -> Bot -> Reset Token. The web app never reads it.                                     |
| `DISCORD_GUILD_ALLOWLIST`                             | For bot  | Bot process only            | Comma-separated server ids the bot may process. Empty: the bot stores nothing.                          |
| `BOT_HEARTBEAT_INTERVAL_MS`                           | No       | Bot process only            | Heartbeat period in ms (default `60000`, 5000-120000). The web shows "offline" after 3 minutes.         |
| `MESSAGE_EVENT_RETENTION_DAYS`                        | No       | Bot process only            | Days of raw message events kept (default `30`, 30-365). Daily totals are kept; see Analytics below.     |

Sign-in counts as configured only when `AUTH_SECRET`, `AUTH_DISCORD_ID` and
`AUTH_DISCORD_SECRET` are all set. Auth.js trusts the host automatically in
development (`NODE_ENV` is not `production`), so `npm run dev` on localhost
needs neither `AUTH_URL` nor `AUTH_TRUST_HOST`.

## Scripts

| Script                                      | What it does                                             |
| ------------------------------------------- | -------------------------------------------------------- |
| `npm run dev` / `build` / `start`           | Next.js dev server / production build / serve build      |
| `npm run lint` / `lint:fix`                 | ESLint (flat config, `eslint-config-next`)               |
| `npm run typecheck`                         | `tsc --noEmit`                                           |
| `npm run format` / `format:check`           | Prettier (with Tailwind class sorting)                   |
| `npm test` / `test:watch` / `test:coverage` | Vitest                                                   |
| `npm run test:db`                           | Integration tests against the disposable `nexus_test` DB |
| `npm run check`                             | lint + typecheck + test (run before pushing)             |
| `npm run bot:dev`                           | Run the Discord bot with `tsx watch` (restarts on edits) |
| `npm run bot:start`                         | Run the Discord bot with `tsx` (no watch)                |
| `npm run db:up` / `db:down`                 | Start / stop the Compose PostgreSQL service              |
| `npm run db:generate`                       | `prisma generate` (also runs on `postinstall`)           |
| `npm run db:migrate`                        | `prisma migrate dev` (create + apply a migration)        |
| `npm run db:deploy`                         | `prisma migrate deploy` (apply committed migrations)     |
| `npm run db:studio`                         | Prisma Studio                                            |

## Running the bot

The bot is a separate Node process (`src/bot`), not started by `npm run dev`.
Local setup uses two terminals:

1. `npm run dev` - the web app.
2. `npm run bot:dev` - the bot. It needs `DISCORD_BOT_TOKEN` (Developer Portal ->
   your application -> **Bot** -> Reset Token), `DATABASE_URL` and
   `DISCORD_GUILD_ALLOWLIST` (the ids of the servers it may process).

On the Overview of a server, **Invite bot** opens Discord's authorize page with
one permission, View Channels, and the server pre-selected. The page then shows
the real state: _not installed_, _installed · offline_ or _online_ (a heartbeat
within the last 3 minutes), plus message counts and recent activity. The bot
stores only message id, channel id, author id and timestamp; see
[src/bot/README.md](src/bot/README.md) for exactly what is and is not collected,
troubleshooting and the manual test plan.

## Analytics

Phase 4 turns the stored events into daily numbers. The bot process (nothing
else) does two jobs for every allowlisted community, once at start and then every
15 minutes:

1. **Aggregation:** counts messages and distinct authors per UTC day, in total and
   per channel, into `community_daily_activity` and `channel_daily_activity`, and
   moves the community's watermark `analytics_finalized_through`. Today is never
   finalized.
2. **Retention:** after a successful aggregation, deletes raw `message_events`
   older than `MESSAGE_EVENT_RETENTION_DAYS` (default 30, at most 365), but only
   for days whose aggregate matches the raw rows. If anything does not match,
   nothing is deleted and `retention_skipped` is logged. Daily totals are never
   deleted.

The web reads days up to the watermark from the daily totals and later days from
the raw events, so a day is never counted twice and the numbers stay correct while
aggregation lags. All days and times are **UTC**. `/analytics?range=7|30|90`
(default 30) shows KPIs, two daily charts, a channel table, the heatmap (raw
events, at most 30 days) and the 25 latest events; per-channel distinct authors
are exact for 7 and 30 days and shown as "-" for 90. Channel names come from the
Gateway cache (no extra intent or REST call) and fall back to the id. The page
says it shows recorded activity, not the full Discord history: a day with zero
messages may mean the bot was offline. Decisions: ADR-032 to ADR-038 in
[docs/DECISIONS.md](docs/DECISIONS.md#adr-032); bot details in
[src/bot/README.md](src/bot/README.md#analytics-maintenance-phase-4).

## Database

PostgreSQL runs through `docker-compose.yml` (`postgres:17-alpine`, named
volume, healthcheck). Models: `User`, `Account` and `Session` (Auth.js),
`Community` and `CommunityMembership`, `MessageEvent` (bot activity) and the
Phase 4 tables `CommunityDailyActivity`, `ChannelDailyActivity` and
`DiscordChannel`; see [docs/DECISIONS.md](docs/DECISIONS.md#adr-018) and
[ADR-032](docs/DECISIONS.md#adr-032) for the schema decisions.

```bash
npm run db:up                 # start PostgreSQL
npm run db:deploy             # apply committed migrations (safe: never resets)
npx prisma migrate status     # "Database schema is up to date!" when in sync
```

There are four migrations: `20261028000000_init`, `20261028120000_auth`,
`20261029000000_bot_activity` and `20261030000000_analytics` (all additive). Use
`db:deploy` to apply them. `db:migrate` (`prisma migrate dev`)
is for creating a new migration while developing and may offer to reset a
database that has drifted: read its prompt before answering.

## Routes

| Route                                                      | Access    | What it is                                                                             |
| ---------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| `/login`                                                   | Public    | Sign in with Discord; explains the scopes; link to the demo.                           |
| `/demo`                                                    | Public    | The sample-data dashboard (labelled "Demo data").                                      |
| `/api/health`, `/api/ready`, `/api/auth/*`                 | Public    | Liveness, readiness, Auth.js endpoints.                                                |
| `/`                                                        | Signed in | Bot status and real activity of your selected server (or a redirect to `/onboarding`). |
| `/onboarding`                                              | Signed in | Pick the server to manage.                                                             |
| `/analytics`                                               | Signed in | Real analytics of your selected server; `?range=7`, `30` or `90`.                      |
| `/automations`, `/moderation`, `/leaderboard`, `/settings` | Signed in | "Coming soon" pages naming the phase that delivers them.                               |

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

The SQL (aggregation, retention, the raw queries, channel upserts) is also tested
against a real PostgreSQL. `npm run test:db` runs `tests/integration/*.int.test.ts`
against a disposable database `nexus_test`, never the dev database (its name
replaces the one in `DATABASE_URL`, or set `TEST_DATABASE_URL`). Create it once
inside the Compose container, then apply the migrations to it:

```bash
docker exec nexus-postgres psql -U nexus -d nexus -c "CREATE DATABASE nexus_test"
# DATABASE_URL pointing at nexus_test (same user, password and port):
DATABASE_URL="postgresql://<user>:<password>@localhost:<port>/nexus_test" npx prisma migrate deploy
npm run test:db
```

Adjust user, password and port to your `.env`. Without the database these suites
skip: plain `npm test` still needs no PostgreSQL.

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
the `main` landmark. The nav comes from `src/config/navigation.ts`; Overview and
Analytics are available, the other sections are `status: "soon"` and render an
honest "Coming soon" page naming the roadmap phase that delivers them. On
`/demo` the Overview link points at `/demo`.

## Demo mode

`/demo` shows the dashboard (`src/features/dashboard/`) on deterministic
synthetic data: total and active members, messages, new members with
period-over-period change, a 90-day membership chart, a 30-day activity chart
and a recent-activity feed. The data has `source: "demo"` and a persistent "Demo
data - no Discord server connected" banner. Demo numbers are **never** shown for
a real community: `/` renders only real bot data (or the install steps).

## Troubleshooting

**Port 5432 is already in use** (`npm run db:up` fails to bind). Another
PostgreSQL is running. Set `POSTGRES_PORT=5433` in `.env` and change the port in
`DATABASE_URL` to match, then `npm run db:up` again.

**A page shows "We couldn't load this community's activity" right after a new
migration.** A `npm run dev` started before `prisma generate` keeps the old
Prisma client in memory (it is cached on `globalThis` across hot reloads), and
that client does not know the new tables or columns. Restart `npm run dev` (and
the bot) after every migration.

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

- The bot (`src/bot/`) records message metadata only. Joins, leaves, voice and
  reactions are not collected, so there is no member growth, churn or retention
  cohort analytics; automation, moderation and XP do not exist yet.
- The live bot has not been started by any automated check: the Gateway
  connection, heartbeat, invite flow, daily aggregation and retention against a
  real server are pending a manual run (see the bot README and
  [docs/PROGRESS.md](docs/PROGRESS.md)).
- Analytics show recorded activity only: messages sent while the bot was
  installed and running. A zero day may mean the bot was offline.
- Totals include everything stored for the community, including events from an
  earlier installation if the bot was removed and added again.
- Raw events older than the retention window are deleted by the bot; only the
  daily totals survive. Distinct authors over a range are not available beyond 30
  days, and the heatmap covers at most 30 days.
- The web side assumes the database session time zone is UTC (the Docker default)
  for raw timestamp comparisons.
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
`src/lib`, `src/server/{db,auth,discord,communities,activity}`, `src/bot` (the
bot process), `src/config`, `prisma/`, `tests/`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Project plan](docs/PROJECT_PLAN.md)
- [Decisions (ADRs)](docs/DECISIONS.md)
- [Progress](docs/PROGRESS.md)
