# Project plan

Phases are ordered by dependency. Each phase should leave `main` deployable and
`npm run check` green.

## Phase 1 - Technical foundation (current)

Next.js + TypeScript + Tailwind + shadcn setup, Prisma schema (User, Community,
CommunityMembership), Docker Compose PostgreSQL, env validation, health and
readiness endpoints, lint/format/test tooling, docs. UI work (design system,
app shell, dashboard with demo data) builds on this phase.

## Phase 2 - Discord OAuth2 and real communities

Sign in with Discord, session handling, store `User` rows, list the guilds a
user can manage, register a `Community`, memberships and role checks. Replaces
demo data for identity and community selection.

## Phase 3 - Bot process and event ingestion

Separate bot process (`src/bot/`) joined to registered guilds. Ingest events
(joins, leaves, messages, voice, reactions) into new event tables with sensible
retention and aggregation. Requires privileged gateway intents review.

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
