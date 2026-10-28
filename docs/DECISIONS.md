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
