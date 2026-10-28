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

## Phase 3 - Bot process and event ingestion (next)

Separate bot process (`src/bot/`) joined to registered guilds. "Invite bot" on
the Overview becomes real and sets `communities.bot_connected_at`. Ingest events
(joins, leaves, messages, voice, reactions) into new event tables with sensible
retention and aggregation. Requires privileged gateway intents review. First
Settings content (install and disconnect the bot) and periodic permission
re-verification land here.

## Phase 4 - Analytics from real data

Replace dashboard demo data with queries over ingested events: growth,
retention, activity heatmaps, top channels. Pre-aggregated rollups where
needed.

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
