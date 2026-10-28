# Decisions

Short ADR-style records. Status is "Accepted" unless noted.

<a id="adr-001"></a>

## ADR-001: npm as package manager

- **Context:** pnpm is not installed on the development machine; npm ships with
  Node.
- **Decision:** use npm; commit `package-lock.json`; `.npmrc` sets
  `save-exact=true`; dependency versions are pinned exactly.
- **Consequence:** zero extra tooling for contributors. Can migrate later.

<a id="adr-002"></a>

## ADR-002: Single package at the repo root, no workspaces

- **Context:** one product with a web app and (later) a bot sharing the DB layer.
- **Decision:** one `package.json`; the bot will live in `src/bot/` as a separate
  process. No Turborepo/pnpm workspaces.
- **Consequence:** simpler imports and tooling. If independent releases become
  necessary, extract `src/lib` / `src/server` into packages then.

<a id="adr-003"></a>

## ADR-003: Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui

- **Decision:** Next.js 16 App Router, `src/` dir, alias `@/*`. TypeScript
  `strict` plus `noUncheckedIndexedAccess`. Tailwind v4 configured in CSS
  (`globals.css`). shadcn/ui prepared (`components.json`, `cn()`), components
  added on demand.
- **Deviation from scaffold:** `create-next-app` 16.4 enables `cacheComponents`
  and `partialPrefetching`; both were removed. `cacheComponents` conflicts with
  `export const dynamic = "force-dynamic"` used by the probes and changes
  caching semantics the project has not opted into. Revisit deliberately.
- **Deviation:** no remote Google Fonts at build time; a system font stack is
  used until the design system chooses fonts (builds stay offline-safe).

<a id="adr-004"></a>

## ADR-004: Pin TypeScript 6 and ESLint 9

- **Context:** the latest releases are TypeScript 7.0.2 and ESLint 10.x, but `typescript-eslint@8.72.1` (used by `eslint-config-next@16.4.3`) peers on `typescript <6.1.0`, and `eslint-plugin-react` / `eslint-plugin-jsx-a11y` only support ESLint up to 9.
- **Decision:** stay on `typescript@6.0.3` and `eslint@9.39.5` (what npm
  resolves compatibly). Re-evaluate when `eslint-config-next` supports them.

<a id="adr-005"></a>

## ADR-005: Prisma 7.10.1 (stable), not the 8.0 release candidate

- **Context:** the `prisma` npm `latest` dist-tag currently points to
  `8.0.0-rc.28`, while `@prisma/client` `latest` is `7.10.1`.
- **Decision:** pin both `prisma` and `@prisma/client` to `7.10.1`, plus
  `@prisma/adapter-pg` and `pg` (Prisma 7 requires a driver adapter). Use the
  `prisma-client` generator with output `src/generated/prisma` (gitignored,
  generated on `postinstall`) and `prisma.config.ts` for CLI config.

<a id="adr-006"></a>

## ADR-006: Initial schema is only User, Community, CommunityMembership

- **Decision:** model identity (`User`), the managed Discord server
  (`Community`) and the role link (`CommunityMembership`, enum `CommunityRole`)
  only. snake_case table/column names via `@@map`/`@map`.
- **Why only these:** every later feature (events, analytics, automations,
  moderation, XP) hangs off "who is the user" and "which community, with what
  role". Event/analytics tables depend on decisions made in Phases 2-3 (what the
  bot can ingest, retention), so modelling them now would be guesswork.
  `Community.ownerId` uses `onDelete: Restrict`; memberships cascade.

<a id="adr-007"></a>

## ADR-007: Lazy environment validation

- **Decision:** `getEnv()` validates with Zod on first use and memoises; no
  import-time validation. `next build`, static pages and tests do not require
  `DATABASE_URL`. Errors name variables, never values.

<a id="adr-008"></a>

## ADR-008: Health (liveness) and ready (readiness) split

- **Decision:** `/api/health` never touches the DB; `/api/ready` runs `SELECT 1`
  with a 2 s timeout and returns a generic 503 on any failure, so orchestrators
  do not restart a healthy process just because the DB is down, and no
  connection details leak.

<a id="adr-009"></a>

## ADR-009: Initial migration generated without a database

- **Context:** Docker Desktop was not running when the foundation was built.
- **Decision:** generate `prisma/migrations/20261028000000_init/migration.sql`
  with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma
--script`, and add `migration_lock.toml` (`postgresql`). The output was
  reproduced and compared byte for byte.
- **Consequence:** the SQL is derived from the schema, but **has not been applied
  to a real PostgreSQL**. Verify with `npm run db:up && npm run db:deploy`
  before building on it. If it needs changes, regenerate it (no data exists yet).

<a id="adr-010"></a>

## ADR-010: Vitest with the DB module mocked

- **Decision:** tests live in `tests/` (mirroring `src/`), run in Node. `server-only`
  is aliased to an empty stub in `vitest.config.mts`. DB-dependent code is tested
  with mocks; integration tests against Compose PostgreSQL can be added later.
  Component tests (added with the UI work) use jsdom and Testing Library; a
  file opts in with `// @vitest-environment jsdom`, so everything else stays on
  the faster Node environment.

<a id="adr-011"></a>

## ADR-011: Self-hosted Geist fonts via the `geist` package

- **Decision:** Geist Sans and Geist Mono from the `geist` npm package, loaded
  through `next/font/local`, exposed as `--font-geist-sans` / `--font-geist-mono`
  and mapped to `--font-sans` / `--font-mono` in `globals.css`.
- **Why:** `next/font/google` downloads fonts at build time and fails offline;
  the package ships the variable woff2 files, so builds are reproducible with no
  network and no third-party requests at runtime. Geist has good tabular
  numerals (used for every metric) and a matching mono for usernames.
- **Trade-off:** two families, no distinct display face; hierarchy comes from
  size, weight and spacing instead.

<a id="adr-012"></a>

## ADR-012: Recharts through the shadcn `chart` primitive

- **Decision:** charts use Recharts 3 wrapped by shadcn's `ChartContainer`,
  `ChartTooltip`. Colors come from `--chart-*` tokens.
- **Why:** it is the shadcn-supported route (tokens, tooltip styling, config
  typing), supports keyboard navigation through `accessibilityLayer`, and avoids
  hand-rolled SVG for time axes and tooltips. Hand-written SVG was considered
  and rejected for the tooltip and axis work it would re-implement.
- **Consequences:** chart components are client components (they receive
  serialisable data from server components). Animation is disabled on marks.
  Each chart needs its own text summary and hidden data table because Recharts
  output alone is not useful to screen readers (see `ChartCard`, `SrDataTable`).

<a id="adr-013"></a>

## ADR-013: Deterministic demo data behind `getDashboardData()`

- **Decision:** the dashboard reads a typed `DashboardData` produced by a pure
  generator (seeded mulberry32 PRNG, fixed reference end date constant). The
  data carries `source: "demo" | "live"`; the UI shows the demo banner and
  "(demo)" labels only when the source is `"demo"`.
- **Why:** SSR and hydration must agree, tests must be reproducible, and the
  app must never imply a real server is connected. Using `Date.now` or
  `Math.random` would break all three.
- **Consequences:** the "current date" of the demo is fixed (2026-10-26) and will
  look stale over time; that is intended. Phase 4 replaces the body of
  `getDashboardData()` and nothing in the UI changes.

<a id="adr-014"></a>

## ADR-014: Navigation config with a `"soon"` status

- **Decision:** `src/config/navigation.ts` lists every planned section with
  `status: "available" | "soon"`, its roadmap phase and planned scope. The
  sidebar shows a "Soon" badge on unavailable items; their routes exist and
  render the shared `ComingSoon` page, which reads the same config.
- **Why:** users see where the product is going without fake UI, links never
  404, and the sidebar, header title, page metadata and placeholder text cannot
  drift apart. Making a section real is one change: set `status: "available"`
  and replace the page body.
- **Consequences:** the nav list is static and a client component imports it
  directly (icon components cannot cross the server/client boundary as props).
  A test asserts exactly one available item and unique hrefs.

<a id="adr-015"></a>

## ADR-015: Auth.js v5 with the Prisma adapter

- **Decision:** `next-auth@5.0.0-beta.32` (pulls `@auth/core` 0.41.3) and
  `@auth/prisma-adapter@2.11.3`, both pinned exactly. The configuration is a
  function (`NextAuth(() => buildAuthConfig())`), evaluated per request, so
  importing it needs neither the database nor any auth variable. Env names are
  the v5 ones: `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`. They are
  optional for `next build` and the tests; `isAuthConfigured()`
  (`src/lib/env.ts`) says whether sign-in can work, and every protected page fails
  closed (redirect to `/login?error=Configuration`) when it cannot.
  `AUTH_URL` / `AUTH_TRUST_HOST` are read by Auth.js itself: in production
  (`next start` on any host, including localhost) one of them must be set or
  Auth.js answers `UntrustedHost`; `trustHost: true` is deliberately not
  hard-coded.
- **Why:** it is the maintained OAuth + session layer for Next.js, handles PKCE,
  state, CSRF and cookies, and the adapter gives database sessions for free.
  Writing OAuth by hand would re-implement exactly the parts that are easy to get
  wrong. v5 is still tagged beta, but it is the line that supports Next 16 (peer
  range `^16`); v4 does not.
- **Prisma 7 compatibility:** the adapter's peer range (`@prisma/client >=2.26`)
  accepts 7.10.1, so no `overrides` are needed. Its types still import
  `PrismaClient` from `@prisma/client`, while this repo uses the `prisma-client`
  generator with a custom output, so `getDb()` is cast once (`as unknown as
Parameters<typeof PrismaAdapter>[0]`) in `src/server/auth/config.ts`. At runtime
  the adapter only calls the `user`, `account` and `session` delegates on our
  flow, and all of them exist.
- **`VerificationToken` is omitted:** only the email provider calls it, and no
  email provider is configured. Adding one later means adding the model and a
  migration.
- **Trade-offs:** a beta dependency (pinned, so upgrades are deliberate); two
  copies of the profile (`name`/`image` for Auth.js, `displayName`/`avatarUrl` for
  NEXUS) because the adapter writes the first pair verbatim; Discord tokens are
  stored in plain text in `accounts`, as the adapter does by default. Encrypting
  them at rest is a future hardening item.
- **What Auth.js does not do and we add (`src/server/auth/sync.ts`):** on later
  sign-ins Auth.js only opens a session and does not update the stored tokens or
  the profile, which would leave a stale Discord token. An `events.signIn` handler
  refreshes the account tokens and the user profile on every sign-in. A custom
  `logger` prints only the error type, because Auth.js otherwise logs whole error
  objects whose causes can contain response bodies.

<a id="adr-016"></a>

## ADR-016: Database sessions, minimal public session, server-side authorization

- **Decision:** `session: { strategy: "database", maxAge: 30 days, updateAge: 1
day }`. The `session` callback builds the session from scratch from three
  whitelisted fields, `{ user: { id, name, image }, expires }` (`toPublicSession`),
  never by spreading what the adapter hands over (that object contains the session
  token and the full user row). No tokens, no `discordId`, no email.
- **Authorization rule:** access is decided on the server, with `requireUser()` /
  `getCurrentUser()` (`src/server/auth/user.ts`), in server components, server
  actions and route handlers. Never client state. The `(app)/(protected)` layout
  is only a first gate: layouts are not re-rendered on client navigation, so every
  page or action that reads user data calls `requireUser()` itself. Both helpers
  call `connection()` first so these routes are never prerendered (a build without
  auth variables must not bake "not configured" into static HTML; this was caught
  during verification, the first build marked `/` as static).
- **No `proxy.ts`:** with database sessions a proxy cannot validate a session (it
  would need a database round trip on every request). A cookie-presence check
  would be UX only, would add a second place where the rule can drift, and is easy
  to mistake for security. Unauthenticated users are redirected by the server
  components instead.
- **Why database sessions:** a session can be revoked server-side (sign-out
  deletes the row), nothing token-shaped is in the cookie, and the cookie stays
  small. The cost is one indexed read per request, deduplicated per request with
  React `cache`.
- **Consequence:** the sliding expiry is refreshed when `auth()` runs in a route
  handler or action, not while rendering a server component (cookies cannot be set
  there), so a session may expire up to `maxAge` after the last write rather than
  after the last visit. Acceptable at 30 days.

<a id="adr-017"></a>

## ADR-017: Discord scopes `identify guilds`, email stays null

- **Decision:** the Discord provider requests exactly `identify guilds`. There is
  no `email` scope, so `users.email` is always null. A custom `profile()`
  (`mapDiscordProfile`, validated with Zod) returns the columns of the existing
  `User` model: `discordId` (profile id), `username`, `displayName`
  (`global_name ?? null`), `avatarUrl` (CDN URL; Discord's default avatar when none
  is set), `email: null`, plus `name`/`image` for the adapter.
- **Why:** NEXUS needs to know who you are and which servers you manage, nothing
  more. Less data requested means less to protect and a shorter consent screen.
  Because the email is null, Auth.js never tries to link accounts by email (its
  main account-takeover guard) and identity is the Discord id alone, which is
  stable.
- **Consequence:** NEXUS cannot email users. If that is ever needed it is a
  separate, explicit decision (new scope, new consent).

<a id="adr-018"></a>

## ADR-018: Schema changes for auth and community discovery (additive migration)

- **Decision:** migration `20261028120000_auth`, additive only; the
  `20261028000000_init` file is untouched. It adds:
  - `users.name`, `users.image`, `users.email_verified` (fields the adapter reads
    and writes; `email_verified` stays null) and the relations to the two new
    tables;
  - `accounts` (adapter model, unique `(provider, provider_account_id)`, cascade
    on user delete) and `sessions` (`session_token` unique, cascade);
  - `communities.owner_id` becomes nullable (`DROP NOT NULL`, non-destructive),
    `onDelete: Restrict` kept. Meaning: the NEXUS user who is the Discord owner of
    the guild, if known. A community can exist before its Discord owner has ever
    signed in (an administrator may register it first);
  - `communities.bot_connected_at` (null = the NEXUS bot is not installed; nothing
    sets it in Phase 2, Phase 3 will);
  - `community_memberships.last_verified_at` (last time Discord confirmed the
    permission, set on every selection).
- **Not added:** `connectedById` on `Community`. `memberships.joinedAt` already
  answers "who connected it first", and a nullable foreign key to maintain would
  carry no information the data does not have.
- **How it was produced:** `prisma migrate dev` was avoided on purpose (it can
  propose a reset on a database with data). The SQL came from `prisma migrate diff
--from-migrations ... --to-schema ... --script` using a throwaway shadow database
  (Prisma 7 takes the shadow URL from the config file, there is no CLI flag), and
  was applied with `prisma migrate deploy`.

<a id="adr-019"></a>

## ADR-019: Discord API client, token refresh and eligibility rules

- **Decision:** `src/server/discord/`.
  - `permissions.ts`: permission bitfields are parsed as `BigInt` from digit-only
    strings (anything else is `0n`, so a malformed value never grants access; bits
    above 2^53 stay exact). A guild is eligible when the user is the owner, or has
    `ADMINISTRATOR` (`1<<3`) or `MANAGE_GUILD` (`1<<5`); the strongest reason is
    returned (`owner`, `administrator`, `manage_server`).
  - `api.ts`: `fetchCurrentUserGuilds(token)` validates the response with Zod
    (extra fields tolerated) and never throws. It returns `unauthorized`
    (401/403), `rate_limited` (429; one inline retry if `retry_after` is 2 s or
    less, otherwise the value is returned), `unavailable` (5xx, network, 8 s
    timeout through `AbortSignal.timeout`) or `invalid_response`. `fetch` and
    `sleep` are injectable. Caught errors are dropped, not wrapped, so a token can
    never end up in a message.
  - `tokens.ts`: `getValidDiscordAccessToken(userId)` refreshes with a 60 s skew
    using the stored refresh token, persists the rotated pair in one `update`, and
    answers `reauth_required` (no account, no usable token, missing `guilds` scope,
    `invalid_grant`) or `unavailable` (network, 5xx, bad response). Discord rotates
    refresh tokens, so two concurrent refreshes race: on `invalid_grant` the row is
    re-read and a token stored meanwhile by the other request is used instead of
    forcing a new sign-in.
  - `guilds.ts`: `getEligibleGuilds(userId)` combines the above, filters, and
    annotates each guild (already a NEXUS community, bot connected, the user is
    already a member). Any unexpected failure, including the database, becomes
    `unavailable`.
- **Why live calls and no cache:** the guild list is the authorization source for
  community selection; a stale cache would let a demoted admin keep access. Calls
  are rare (onboarding and selection).
- **Consequence:** tokens are only handled by server code; they are never
  returned to a component, logged or put in a session.

<a id="adr-020"></a>

## ADR-020: Community selection, tenant isolation and the active-community cookie

- **Decision:** `src/server/communities/`.
  - `selectCommunity(userId, guildId)` validates the id as a snowflake, then
    re-fetches the user's guilds from Discord and requires the guild to be in that
    list with owner / Administrator / Manage Server. The submitted id is never
    trusted on its own. In one transaction it upserts the `Community` (name and
    icon refreshed; `ownerId` set only if the user is the Discord owner and none is
    recorded) and upserts the user's own membership (`OWNER` if owner, else
    `ADMIN`; a former owner is demoted to `ADMIN`; other existing roles are kept)
    with `lastVerifiedAt = now`. It is idempotent, only writes the caller's
    membership, and retries the whole transaction once on a Prisma `P2002` (two
    first-time selections of one guild racing on `discord_guild_id`; Postgres
    aborts the losing transaction, so the retry restarts it).
  - Tenant isolation: the only ways to read a community are
    `listUserCommunities(userId)` and `getUserCommunity(userId, communityId)`, both
    through a membership row. There is no unscoped "get by id".
  - The active community is a hint stored in the httpOnly, `SameSite=Lax`,
    `Secure`-in-production cookie `nexus_community`. `getActiveCommunity(userId)`
    re-validates it against the memberships on every call (a forged or stale id is
    ignored) and falls back to the most recently joined membership, then to null.
  - `selectCommunityAction(prevState, formData)`
    (`src/features/communities/actions.ts`) is the form entry point for
    `useActionState`: it takes the user from the session (never from the form),
    calls `selectCommunity`, sets the cookie and redirects to `/`, or returns a
    typed error state.
- **Layering:** `src/server/*` holds data access and Discord I/O (as `server/db`
  already did); `src/features/*` holds the actions and components routes use.
  Routes import from features; features import from `server/*`.
- **Consequence:** a user who loses Manage Server on Discord keeps their old
  membership until a later selection re-verifies it. Periodic re-verification
  (using `lastVerifiedAt`) belongs to Phase 3, when real data starts depending on
  it.

<a id="adr-021"></a>

## ADR-021: Public demo at `/demo`, authenticated app at `/`

- **Decision:** the existing demo dashboard moved from `/` to the public `/demo`
  route (same components and shell, same demo banner). `/` and every other app
  route (`/analytics`, `/automations`, `/moderation`, `/leaderboard`, `/settings`,
  `/onboarding`) live in `src/app/(app)/(protected)/` and require a session.
  `/login`, `/demo`, `/api/health`, `/api/ready` and `/api/auth/*` are public. `/`
  redirects to `/onboarding` when the user has no community, and otherwise shows a
  "not connected" state until the bot exists.
- **Why:** visitors and reviewers can still see the product without a Discord
  account or any configuration, and the demo can never be mistaken for the user's
  real data because it has its own URL.

<a id="adr-022"></a>

## ADR-022: The demo state is per route, not a global switch

- **Decision:** `siteConfig.dataMode` (a constant `"demo"`) is gone.
  `DemoIndicator` is a client component that renders only when the pathname is
  `/demo` (`isDemoPath`, `src/config/navigation.ts`). Navigation stays in one
  config: Overview has an optional `demoHref: "/demo"`, and `SidebarNav` links and
  highlights it through `resolveNavHref` / `isActivePath` while on the demo; the
  other items keep their own links and "Soon" badges. `/` keeps being the
  Overview link everywhere else (the Brand link too: `requireUser()` decides what
  a visitor sees there).
- **Why:** with real communities, a global "demo" flag would label real pages as
  demo (or the reverse). Which data is on screen is a property of the route:
  `/demo` is always synthetic, everything under `(protected)` is never synthetic.
- **Consequence:** a visitor on `/demo` who clicks a "Soon" section is sent to
  `/login` by the server guard; acceptable for now.

<a id="adr-023"></a>

## ADR-023: Account menu in the header and a membership-only community switcher

- **Decision:** the header's static "Guest" placeholder is replaced by an `account`
  slot, filled in `(app)/layout.tsx` with the server component `HeaderAccount`
  (`features/auth`). Signed in, it renders the client `UserMenu`: a Radix
  `DropdownMenu` (a hand-written shadcn-style `ui/dropdown-menu.tsx` on the
  existing `radix-ui` package, so keyboard, focus and ARIA behaviour come from
  Radix) with the avatar or initials, the name, the community switcher (only when
  the user has more than one), "Change community" (`/onboarding`) and "Sign out"
  (a form posting `signOutAction`). Signed out (the demo) it renders a "Sign in"
  link. The menu items that submit forms call `preventDefault` in `onSelect`, so
  the menu is not unmounted before the form submits. The props of `UserMenu` are
  `{ name, image }`, community `{ id, name }` pairs and the active id: no user id,
  no tokens, no Discord account data.
- **Switcher action:** `switchActiveCommunityAction` takes the user from
  `requireUser()`, looks the submitted id up with `getUserCommunity(user.id, id)`
  (a membership lookup) and sets the cookie only on a hit; any other value
  (someone else's community, unknown, empty, oversized) changes nothing. It makes
  no Discord call, unlike `selectCommunityAction`, because switching between
  communities the user already has needs no new authorization. Tests cover
  tenant isolation with the in-memory DB.
- **Why a slot and not an import in `AppHeader`:** `components/layout` must not
  import `server/*` or `features/*` (layering). The layout passes the account in.
- **Resilience:** `HeaderAccount` catches any failure while reading the session or
  memberships and renders the signed-out link, so the public demo never fails
  because the database is down. A visible side effect: the demo is now rendered
  per request (the session cookie is read), not prerendered.

<a id="adr-024"></a>

## ADR-024: Onboarding and Overview states

- **Decision:**
  - `/` for a signed-in user without a community **redirects** to `/onboarding`
    instead of rendering a call-to-action card: there is exactly one place that
    explains how to connect a server, and the redirect is testable and
    unambiguous.
  - `/` with a community whose bot is not connected shows an honest page:
    community header (icon or initials, name, role), why live analytics need the
    bot (Phase 3), what will appear, a disabled "Invite bot" button, and links to
    `/demo` ("See what it will look like") and `/onboarding`. It contains no
    numbers. A community with `botConnected = true` (impossible before Phase 3)
    gets a neutral "live analytics arrive in Phase 4" placeholder, still no data.
  - `/onboarding` renders each result of `getEligibleGuilds` as its own state:
    the list (reason badge, connection badge, "Selected" for the active
    community, Connect or Select with pending state and inline errors per error
    code, rate limits with a wait in seconds, a "Sign in again" action for
    `reauth_required`), an empty state that states the permission rule, a
    reconnect card, a rate-limit card and an unavailable card with a reload link.
    The view (`OnboardingView`) is pure presentation; the page does the session
    check and data loading.
  - The Discord sign-in buttons use `useFormStatus` (`DiscordSubmitButton`) so a
    double click cannot start two authorizations.
  - The Settings entry no longer lists "Sign in with Discord" as planned (it
    exists); it is assigned to Phase 3 (installing and disconnecting the bot is
    its first real content).
- **Accessibility detail:** a button's accessible name is set with `aria-label`
  ("Connect Pixel Guild"), not a visually hidden span, because adjacent inline
  text nodes concatenate without a space in the accessible-name computation.
- **Consequence:** `alreadySelected` from `getEligibleGuilds` means "the user has a
  membership", not "is the active community"; "Selected" is computed by comparing
  the community id with `getActiveCommunity`.
