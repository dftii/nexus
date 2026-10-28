# Progress

Last updated: 2026-10-28 (Phase 2: Discord sign-in, community selection, onboarding UI).

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

### Not verified

- **The real Discord flow end to end:** the consent screen, the callback, the token exchange, the profile fetch, the live guild list, a real token refresh and a real `selectCommunity` with a real Discord account. From the development machine Node's `fetch` to discord.com fails with `SELF_SIGNED_CERT_IN_CHAIN` (HTTPS interception by local security software), so no live Discord call has succeeded here. The fix is environmental: `NODE_EXTRA_CA_CERTS` pointing at the intercepting root CA (see README, Troubleshooting).
- The onboarding **list** (cards with real guild icons, "Selected", Connect/Select with a real response) was only rendered in tests, not in a browser, because a guild list needs a live Discord response. The reconnect state was seen in a browser.
- `selectCommunity` against a real PostgreSQL (transaction, upserts, the `P2002` retry).
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

## Not implemented yet (by design)

The bot process, real data, analytics from real events, automations,
moderation, XP. See [PROJECT_PLAN.md](PROJECT_PLAN.md).
