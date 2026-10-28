# Progress

Last updated: 2026-10-29 (Phase 3: Discord bot, invite flow, real activity on the Overview).

Legend used below: **verified** = a real command or a real run observed the
behaviour; **mocked** = covered by automated tests that replace Discord (and
sometimes the database) with fakes; **not verified** = never run.

## Phase 1 (done and verified)

| Item                                                      | Verification                                           |
| --------------------------------------------------------- | ------------------------------------------------------ |
| Dependencies install (0 audit vulnerabilities)            | `npm install`, `npm audit`                             |
| ESLint, TypeScript strict, Prettier clean                 | `npm run lint`, `typecheck`, `format:check`            |
| Production build without `DATABASE_URL` or auth variables | `npm run build`                                        |
| Prisma schema valid; client generates                     | `npx prisma validate`, `npm run db:generate`           |
| Compose file valid                                        | `docker compose config`                                |
| Tailwind utilities compiled into production CSS           | inspected built CSS                                    |
| Design system, app shell, demo dashboard                  | build + a manual look in a browser (desktop and 360px) |

## Phase 2

### Verified (observed against real services)

| Item                                                                                                                                                                                                                                                                                                                                                                                                                                                         | How                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Both migrations (`20261028000000_init`, `20261028120000_auth`) apply to a live PostgreSQL; status "up to date"                                                                                                                                                                                                                                                                                                                                               | `docker compose` PostgreSQL, `prisma migrate deploy`, `prisma migrate status`                                        |
| `/api/ready` returns 200 against the live database                                                                                                                                                                                                                                                                                                                                                                                                           | `next start` + curl                                                                                                  |
| Session shape: a session row inserted with SQL is read by Auth.js and yields only `{ id, name, image }` + `expires`                                                                                                                                                                                                                                                                                                                                          | SQL insert + `next start` + a cookie                                                                                 |
| The OAuth redirect to Discord carries `scope=identify guilds`, `state` and PKCE (`code_challenge`, S256)                                                                                                                                                                                                                                                                                                                                                     | Observed the 302 `Location` from the sign-in action; no consent given                                                |
| Protected routes redirect to `/login` when signed out (and to `/login?error=Configuration` when auth is not configured)                                                                                                                                                                                                                                                                                                                                      | `next start` + curl on `/`, `/onboarding`, `/analytics`                                                              |
| `/login`, `/demo` (contains "Demo data"), `/api/health`, `/api/ready` return 200                                                                                                                                                                                                                                                                                                                                                                             | `next start` + curl                                                                                                  |
| UI with a SQL-seeded session: Overview "not connected" page for the selected community with no demo data or demo badge; header user menu (name, avatar initials); community switcher changes the active community; "Sign out" deletes the session and lands on `/login`; `/onboarding` shows the "Reconnect Discord" state for a user with no Discord account row; the user menu data in the page payload holds only name, image and community ids and names | Built-in browser pane against `next start` with a temporary user, two communities and a session (removed afterwards) |
| `/demo` as a visitor: "Sign in" link, Overview highlighted, "Demo data" badge and banner                                                                                                                                                                                                                                                                                                                                                                     | Same browser session                                                                                                 |

### Mocked (automated tests; Discord and, mostly, the database are replaced)

- Discord API client: guild list parsing, 401/403, 429 with `retry_after`, 5xx, timeouts, invalid payloads.
- Token refresh: expiry skew, rotation, `invalid_grant`, concurrent refresh.
- Eligibility rules (owner / Administrator / Manage Server, BigInt permissions).
- `selectCommunity`: snowflake validation, re-check against the guild list, idempotency, race retry, ownership and roles. Uses an in-memory fake of the Prisma client, **not** a real database.
- Tenant isolation of `listUserCommunities` / `getUserCommunity` / `getActiveCommunity` and of `switchActiveCommunityAction` (also in-memory fake).
- `requireUser`, the public session shape, the redirect-path guard, login error mapping.
- UI states: Overview (no community, not connected, connected placeholder, no demo data or numbers), onboarding (list with badges, Selected, empty, reconnect, rate limit with seconds, unavailable), the select form (pending state and every error code, "Sign in again"), the user menu (name, sign-out form, switcher, no tokens in props or DOM), `HeaderAccount` (only plain data reaches the client component; failure degrades to "Sign in"), `DemoIndicator` only on `/demo`, sidebar on the demo.

### Verified live with a real Discord application (2026-10-28, `npm run dev`)

- Consent screen, callback, token exchange and profile fetch: a real Discord account signed in and landed on `/onboarding`.
- The live guild list: three owned guilds rendered with real icons and "Owner" / "Not in NEXUS yet" badges.
- A real `selectCommunity` against PostgreSQL: one community (owner set, `bot_connected_at` null) and one `OWNER` membership with `last_verified_at`, then the honest "not connected" Overview.
- Database rows after sign-in: one user with `discord_id`, one Discord account with access and refresh tokens (server-side only), one live session.
- First attempt failed with `CallbackRouteError`: Discord sends `iss=https://discord.com` on the callback (RFC 9207) and Auth.js' built-in Discord provider declares no issuer, so the check ran against the `https://authjs.dev` fallback. Fixed by setting `issuer: "https://discord.com"` on the provider (regression test in `tests/server/auth/auth.test.ts`).
- The earlier `SELF_SIGNED_CERT_IN_CHAIN` seen from the agents' tooling was not reproducible from a normal shell on the development machine; Node reached discord.com with the genuine certificate chain. The README troubleshooting entry is kept for machines that do intercept TLS.

### Not verified

- A real token refresh (the Discord access token lasts about 7 days); covered by mocked tests only.
- The `P2002` race retry in `selectCommunity` against a real database (covered by tests with a fake client).
- Sign-in with a returning user (the `events.signIn` token and profile refresh) against a real database.
- Cookie behaviour in production mode over HTTPS (`Secure` flag).
- Keyboard and screen-reader behaviour of the user menu beyond what Radix provides and the Testing Library roles check; no axe/Lighthouse audit.
- The mobile layout of the new screens (onboarding, Overview, user menu) was not looked at in a browser.

### Automated checks

`npm test`: 284 tests passing (219 before the UI pass). `npm run lint`,
`typecheck`, `format:check`, `build`, `npx prisma validate` and `npx prisma
migrate status` are clean.

### Known gaps and follow-ups

- Permission re-verification of existing memberships (`lastVerifiedAt` is
  recorded, nothing reads it yet): with the bot, Phase 3.
- Discord tokens are stored in plain text in `accounts`; encrypt at rest.
- A visitor on `/demo` who clicks a "Soon" section is sent to `/login`.
- No light theme, no theme switcher.

## Phase 3

### Verified (a real command or run observed it)

| Item                                                                                                                    | How                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Migration `20261029000000_bot_activity` is applied; schema valid                                                        | `npx prisma migrate status`, `npx prisma validate`                                             |
| The `COUNT(DISTINCT author_discord_id)` raw query and the min/max aggregate run against the real PostgreSQL             | Read-only script with a non-existent community id (returns 0 / null); nothing written          |
| Lint, typecheck, format, tests and production build pass; unauthenticated smoke of `/login`, `/demo`, `/`, `/api/ready` | `npm run lint`, `typecheck`, `format:check`, `test`, `build`, `next start` on port 3141 + curl |

### Mocked (automated tests with fakes)

- Invite URL: exact parameters, `scope=bot`, `permissions=1024`, no secret, invalid ids give null.
- Activity queries: every query scoped to one community id, 24 h / 7 d windows, empty state, row mapping with no content field (Prisma client replaced by mocks).
- `getOverviewData`: uses only `getActiveCommunity`, null without a community, skips activity queries when not installed, typed error on database failure, never another community's id.
- Overview UI: not installed (invite link, steps, no metrics), invite disabled when auth is not configured, offline (heartbeat, metrics kept), online, empty events, recent list (ids in mono, no content), error state, no demo data.
- Auto refresh: 30 s interval, paused while the tab is hidden, one refresh on return, cleanup on unmount.
- Onboarding badges derived from the bot status; `getEligibleGuilds` returns `botStatus`.
- Bot services (first part of Phase 3): allowlist, classification, batch writer, installation, heartbeat, logger scrubbing, with an in-memory repository.

### Verified live against Discord (2026-10-28, test server CAPTURAS)

The developer started the bot with `npm run bot:start`; agents never started it.

- **Invite:** the Overview's Invite bot link installed the bot in CAPTURAS with the View Channels permission; Discord listed it as offline until the process started.
- **Gateway and installation:** the bot connected, Discord showed it online and the Overview switched to "Bot online" with a fresh heartbeat (auto refresh, no reload).
- **Ingestion:** 8 messages sent in CAPTURAS were stored: 8 rows, 8 distinct message ids, 1 author. `message_events` has only `id`, `community_id`, `discord_message_id`, `discord_guild_id`, `discord_channel_id`, `author_discord_id`, `occurred_at`, `created_at`; no content column. The Overview showed the counts and the recent list.
- **Offline:** after the process stopped, the Overview showed "Bot installed · offline" once the last heartbeat was older than 3 minutes, keeping the recorded metrics.
- **Removal:** after kicking the bot and restarting the process, the ready-time reconcile cleared `bot_connected_at` and the Overview showed "Bot not installed" with the invite; the 8 events stayed in the database.

### Not verified

- A clean Ctrl+C shutdown (the process was stopped by closing its terminal) and the database retry path of the batch writer against a real outage.
- `guildCreate` while the bot is running (re-inviting while online) and `guildDelete` with a real outage (`available === false`).
- The Overview at mobile width with a real installed bot.

### Known gaps and follow-ups

- Counts include every stored event for the community, also from a previous installation of the bot (history is kept when the bot is removed).
- No retention or aggregation of `message_events` yet (Phase 4).
- `npm run bot:dev` uses `tsx watch`; use `bot:start` to observe a clean Ctrl+C shutdown.
- The `bot:dev` / `bot:start` scripts were missing from `package.json` when this part started and were added.

## Not implemented yet (by design)

Analytics from real events beyond the Overview counts, joins / leaves / voice / reactions, automations, moderation, XP. See [PROJECT_PLAN.md](PROJECT_PLAN.md).
