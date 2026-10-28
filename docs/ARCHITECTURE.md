# Architecture

NEXUS is a single npm package (no workspaces) containing a Next.js web app and,
later, a Discord bot process that share the same database layer.

## Directory layout

```
src/
  app/            Routes only (thin). Pages, layouts, route handlers.
    (app)/        Route group with the app shell layout; Overview at /,
                  placeholder pages for the sections that are not built
    api/health/   Liveness probe
    api/ready/    Readiness probe (checks the database)
  components/
    ui/           shadcn/ui primitives (generated/owned code)
    layout/       App shell: sidebar, header, navigation
    common/       Shared building blocks: StatCard, ChartCard, EmptyState, ...
  features/<f>/   Feature modules: components, queries, types for one domain
                  (e.g. dashboard). Routes import from here.
  lib/            Shared, framework-agnostic utilities (cn, env, ...)
  server/db/      Prisma client singleton + DB helpers. server-only.
  config/         Static app config (site name, nav, ...)
  generated/      Prisma client output. Gitignored; created by `prisma generate`.
  bot/            Planned Discord bot process (README only for now)
prisma/           schema.prisma and migrations/
tests/            Vitest tests, mirroring src/ paths
docs/             Project documentation
```

## Layers and dependency rules

```
app (routes) -> features -> components, lib, server
components   -> lib            (never server/)
features     -> components, lib, server/db (server components/actions only)
server/db    -> lib (env), generated/prisma
bot (future) -> server/db, lib (never app/, components/)
```

- Routes stay thin: parse input, call a feature function, render.
- Anything touching the database imports from `@/server/db`, which starts with
  `import "server-only"`, so a client component importing it fails the build.
- Path alias: `@/*` maps to `src/*`.

## Data flow (current)

```
Browser -> Next.js route (src/app) -> [feature code] -> getDb() -> PostgreSQL
```

Phase 1 pages do not read the database yet. The dashboard will initially render
**demo data** from a feature-level fixture so the UI can be built and reviewed
without OAuth or a bot.

## Environment handling

`src/lib/env.ts` validates server variables with Zod, but **lazily**: `getEnv()`
parses `process.env` on first call and memoises it. Nothing validates at import
time, so `next build` and pages that never touch the database work without
`DATABASE_URL`. Error messages list variable names only, never values.

## Database access

- `getDb()` (`src/server/db/client.ts`) creates the Prisma client on first use
  with the `@prisma/adapter-pg` driver adapter (required by Prisma 7). In
  non-production it is cached on `globalThis` so hot reloads reuse one pool.
- `prisma.config.ts` holds CLI configuration (schema path, migrations path,
  datasource URL). It loads `.env` itself because Prisma 7 no longer does.
- The generated client lives in `src/generated/prisma` (gitignored,
  regenerated on `postinstall`).

## Health and readiness

| Endpoint          | Purpose   | Touches DB | Success                    | Failure                      |
| ----------------- | --------- | ---------- | -------------------------- | ---------------------------- |
| `GET /api/health` | Liveness  | No         | `200 {status:"ok",...}`    | n/a                          |
| `GET /api/ready`  | Readiness | `SELECT 1` | `200 {status:"ready",...}` | `503 {status:"unavailable"}` |

`pingDatabase()` applies a 2 s timeout and converts every failure (invalid env,
connection refused, timeout) into `false`, so the response never exposes
connection strings or driver errors. Both routes are `force-dynamic`.

## Future: Discord bot process

Phase 3 adds a long-running bot (discord.js) in `src/bot/`, started separately
(`tsx src/bot/index.ts`) from the web server. It will write events to PostgreSQL
through the same Prisma layer and reuse `src/lib`. It must not import from
`src/app` or `src/components`. Deploy as a second process/container from the
same image or repo. Server-only imports will need a small adjustment for the
bot's runtime (the `server-only` package throws outside React Server
environments); decide when the bot is built.

## Why no monorepo

One deployable product, one team, one set of types. Workspaces would add
tooling and versioning overhead without a second consumer that needs an
independent package. If the bot or a shared SDK later needs independent
release cycles, `src/lib` and `src/server` can be extracted into packages then
(see ADR-002 in [DECISIONS.md](DECISIONS.md)).

## Design system and UI

- Tailwind v4 is configured in CSS (`src/app/globals.css`, `@theme inline`);
  there is no `tailwind.config.js`.
- shadcn/ui (`components.json`, `cn()` in `src/lib/utils.ts`); components are
  added with the shadcn CLI into `src/components/ui` and restyled through
  tokens, not per-use overrides. Added so far: button, card, badge, sheet,
  separator, skeleton, avatar, chart. Local edits to generated files: the CLI
  emitted `import { cn } from "cn"` (fixed to `@/lib/utils`), `transition-all`
  became `transition-colors`, `Card` lost its shadow and got tighter padding,
  `CardTitle` renders an `h2`.

### Tokens

Declared once as `oklch()` on `:root` in `globals.css` and mapped to Tailwind
colors in `@theme inline`. Dark is the default and only theme (`<html
class="dark">` keeps shadcn `dark:` variants active). To add light later,
override the same variables under `:root[data-theme="light"]`; components do
not change.

| Token                            | Value (oklch / hex)           | Role                                                 |
| -------------------------------- | ----------------------------- | ---------------------------------------------------- |
| `background`                     | 0.145 0.012 285 / #09090f     | page canvas (elevation 0)                            |
| `sidebar`                        | 0.165 0.013 285 / #0e0e14     | chrome beside the canvas (1)                         |
| `card`                           | 0.19 0.014 285 / #13131a      | panels (2)                                           |
| `popover`                        | 0.23 0.016 285 / #1c1c24      | floating layers: sheet, chart tooltip (3)            |
| `muted` / `secondary` / `accent` | 0.235-0.28 x 285              | control fills and hover inside panels (4)            |
| `foreground`                     | 0.97 0.004 285 / #f5f5f8      | text, 17:1 on card                                   |
| `muted-foreground`               | 0.72 0.02 285 / #a3a3b1       | secondary text, 7.4:1 on card                        |
| `primary`                        | 0.55 0.21 292 / #794ddf       | brand violet; white text on it is 5.1:1              |
| `ring`                           | 0.72 0.17 292 / #a88dff       | focus ring, 7.5:1 on canvas                          |
| `border` / `input`               | 0.30 / 0.34 x 285             | 1px lines                                            |
| `chart-1` / `chart-2`            | violet #a88fff / cyan #50d9ef | membership series / activity series                  |
| `chart-3..5`                     | green / amber / pink          | reserved for future series                           |
| `signal`                         | 0.82 0.12 210 / #50d9ef       | cyan data accent                                     |
| `success` / `danger` / `warning` | green / coral / amber         | positive change / negative change text / demo notice |
| `destructive`                    | 0.55 0.20 25 / #cc272e        | destructive fills                                    |

Radius base is `0.625rem`. Layout variables: `--header-height`,
`--sidebar-width`. Accent use is deliberately small: the active nav item has a
2px violet bar, and the primary fill appears on the brand mark, buttons and
the skip link. Motion is limited to state changes; a global
`prefers-reduced-motion` rule shortens all animation and transition durations.

### Typography

Geist Sans and Geist Mono from the `geist` npm package (loaded through
`next/font/local`, so no network at build). Base size is 15px for app density;
metrics are 30px semibold with `tabular-nums`. Headings have slight negative
letter-spacing and `text-wrap: balance`. Labels are sentence case, never
tracked capitals.

### App shell

`src/app/(app)/layout.tsx` renders `AppShell` (`src/components/layout`):

- `Sidebar` (fixed, `lg` and up) and `MobileNav` (a `Sheet` drawer behind a
  header button below `lg`, closing when a link is followed) share `Brand` and
  `SidebarNav`.
- `SidebarNav` is the only nav client component (needs `usePathname` for
  `aria-current="page"` and the active style); it imports `navigation` from
  `src/config/navigation.ts`, which is also the source for header titles
  (`HeaderTitle`), per-route `metadata` (`navMetadata(href)`) and the "Coming
  soon" pages (`ComingSoon`).
- `AppHeader`: page title as the page `h1`, `DemoIndicator`, and
  `UserPlaceholder` (static "Guest / Not signed in", not a button; sign-in is
  Phase 2).
- Landmarks: skip link, `nav aria-label="Main"`, `header`, `main#main-content`.
  Main content is capped at `max-w-7xl` and centred; no horizontal scroll at
  360px.

Shared UI lives in `src/components/common`: `StatCard`, `ChartCard`,
`SrDataTable` (visually hidden data table), `EmptyState`, `ComingSoon`.

### Dashboard demo mode

`src/features/dashboard/`:

- `types.ts` - `DashboardData` (the contract; `source: "demo" | "live"`).
- `data/demo.ts` - `buildDemoDashboardData()`: pure and deterministic. Uses a
  seeded mulberry32 PRNG and a fixed reference date (`DEMO_END_DATE`), never
  `Date.now` or `Math.random`, so SSR, hydration and tests agree.
- `data/index.ts` - `getDashboardData()`: the only function the page calls.
  Phase 4 swaps its body for queries over ingested events and returns the same
  shape with `source: "live"`.
- `lib/` - PRNG, delta math (`computeDelta`), chart helpers.
- `components/` - `DashboardView` (layout), `SummaryStats`, `GrowthCard`,
  `MessagesCard`, `ActivityFeed`, `DemoBanner`, `DashboardSkeleton`, and the
  two client chart components (Recharts via the shadcn `chart` primitive).
- Route files: `(app)/(dashboard)/page.tsx`, `loading.tsx` (skeleton),
  `error.tsx` (boundary using Next 16's `retry`).

"Active members" means members who sent a message in the last 7 days. Deltas
compare the last 30 days with the 30 days before. Formatting helpers in
`src/lib/format.ts` fix the locale to en-US and the time zone to UTC.

Chart accessibility: each chart sits in a labelled region (`role="region"`,
`aria-labelledby` title, `aria-describedby` text summary), has a visually
hidden data table with the numbers, keeps Recharts' keyboard navigation
(`accessibilityLayer`) for tooltips, and the growth chart discloses that its
vertical axis does not start at zero. Change indicators combine icon, sign and
a screen-reader word, so colour is never the only signal.
