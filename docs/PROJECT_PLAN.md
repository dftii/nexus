# Project plan

Phases are ordered by dependency. Each phase should leave `main` deployable and
`npm run check` green.

## Phase 1 - Technical foundation (done)

Next.js + TypeScript + Tailwind + shadcn setup, Prisma schema (User, Community,
CommunityMembership), Docker Compose PostgreSQL, env validation, health and
readiness endpoints, lint/format/test tooling, docs. UI work (design system,
app shell, dashboard with demo data) builds on this phase.

## Phase 2 - Discord OAuth2 and real communities (implemented, pending live Discord check)

Sign in with Discord (Auth.js v5, database sessions), `User`/`Account`/`Session`
rows, list the guilds a user can manage (owner, Administrator or Manage Server,
checked live), register a `Community` and the user's membership, an active-
community cookie and a community switcher, server-side route protection, the
onboarding UI and an honest "not connected" Overview. The sample-data dashboard
moved to the public `/demo`.

Status: the code, the migration and the UI states are done and tested with mocks;
the real Discord consent, callback, token exchange, guild fetch and token refresh
have **not** been run yet (see [PROGRESS.md](PROGRESS.md)). Phase 2 is closed once
a real sign-in and server selection have been completed on a machine that can
reach discord.com over verified TLS.

Out of Phase 2 on purpose: periodic re-verification of permissions
(`lastVerifiedAt` is recorded; the job belongs with the bot), encrypting stored
Discord tokens, role management inside NEXUS.

## Phase 3 - Bot process and message ingestion (implemented, pending live Discord check)

Separate bot process (`src/bot/`, `npm run bot:dev`) that records message
metadata (id, channel, author, timestamp; never content) for allowlisted servers
that exist in NEXUS, tracks installation (`botConnectedAt`) and liveness
(`botLastSeenAt`, heartbeat). The Overview's "Invite bot" is a real link (View
Channels only), and the page shows the bot status and real counts, active
authors and recent activity, refreshing every 30 s.

Status: code, migration and UI states are done and covered by mocked tests; the
live bot was **never started** by an agent. The Gateway connection, heartbeat,
invite and kick flows against a real server (CAPTURAS) are pending the manual
test plan in `src/bot/README.md`. Phase 3 is closed once that run passes.

Still out of Phase 3: joins, leaves, voice and reactions; retention and
aggregation; periodic permission re-verification; Settings content.

## Phase 4 - Analytics from real data (implemented, pending live check)

Daily rollups of the ingested events and the first real analytics page. The bot
aggregates `message_events` into per-community and per-channel UTC-day tables
(`community_daily_activity`, `channel_daily_activity`) and moves a per-community
watermark (`analytics_finalized_through`): days up to it are read from the
aggregates, later days from raw events, so nothing is counted twice. After a
verified aggregation the bot deletes raw events older than
`MESSAGE_EVENT_RETENTION_DAYS` (default 30, 30-365); the aggregates are kept.
A scheduler runs both jobs every 15 minutes, and channel names are synced from
the Gateway cache. `/analytics` shows KPIs, daily messages and distinct authors,
a channel table, an hour x weekday heatmap (UTC) and recent events for 7, 30 or
90 days; the Overview uses the same queries.

Status: code, migration `20261030000000_analytics` and UI states are done, with
mocked tests plus integration tests for a disposable PostgreSQL (`npm run
test:db`). What was actually run, including the live bot against CAPTURAS, is
recorded in [PROGRESS.md](PROGRESS.md). Phase 4 is closed once the live run
passes.

Out of Phase 4 on purpose: member growth, churn, joins and leaves, retention
cohorts (they need the `GuildMembers` privileged intent), message content,
encrypting stored Discord tokens, periodic permission re-verification.

## Phase 5 - Automations (rules)

Rule engine: triggers (member joined, keyword, inactivity) and actions (assign
role, send message). Rule editor UI, execution log, dry-run mode.

## Phase 6 - Moderation and audit logs

Moderation actions (warn, timeout, kick, ban), case history, audit log of
actions taken from NEXUS and by the bot, permission-gated by community role.

## Phase 7 - XP and leaderboards

Per-member XP from activity, levels, leaderboards, role rewards. Anti-abuse
(cooldowns) and configuration per community.

## Phase 8 - Optional AI insights

Summaries and recommendations over aggregated analytics (not raw messages by
default). Strictly opt-in per community; privacy review first.

## Out of scope (for now)

Billing and subscription plans, multi-tenant organisations beyond community
roles, and mobile apps.
