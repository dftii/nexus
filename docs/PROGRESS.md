# Progress

Last updated: 2026-10-28 (Phase 1 foundation, UI shell and demo dashboard).

## Done and verified (commands actually run)

| Item                                                       | Verification                                   |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Dependencies install (0 audit vulnerabilities)             | `npm install`, `npm audit`                     |
| ESLint clean                                               | `npm run lint`                                 |
| TypeScript strict clean                                    | `npm run typecheck`                            |
| Unit and component tests - 77 passing                      | `npm test`                                     |
| Production build without `DATABASE_URL`                    | `npm run build`                                |
| Prettier clean                                             | `npm run format:check`                         |
| Prisma schema valid; client generates                      | `npx prisma validate`, `npm run db:generate`   |
| Migration SQL reproducible from schema                     | `prisma migrate diff` compared with committed  |
| Compose file valid                                         | `docker compose config` (works without daemon) |
| `/api/health` returns 200; `/api/ready` returns 503 w/o DB | `next start` + curl, no DB running             |
| Tailwind utilities compiled into production CSS            | inspected built CSS                            |

## Not verified

- Initial migration **applied to a running PostgreSQL** (Docker daemon was not
  running). Do `npm run db:up && npm run db:deploy`.
- `/api/ready` returning 200 against a live database.
- `docker compose up` (container start, healthcheck).
- Prisma client queries against a real database.

## Not implemented yet (by design)

Discord OAuth2, authentication/authorization, the bot process, real data,
analytics, automations, moderation, XP. See [PROJECT_PLAN.md](PROJECT_PLAN.md).

## UI work

Verified with `npm run format`, `lint`, `typecheck`, `test` (77 tests, 13 files), `build`, then `next start` and curl on all routes plus a manual look in a browser at desktop and 360px width.

### Design system

- Tokens in `src/app/globals.css` (oklch, shadcn names plus `signal`, `success`, `danger`, `warning`), dark-first with a structure ready for a light theme; documented in [ARCHITECTURE.md](ARCHITECTURE.md#design-system-and-ui).
- Geist Sans/Mono self-hosted (ADR-011). shadcn components added: button, card, badge, sheet, separator, skeleton, avatar, chart.
- Not done: a light theme, a theme switcher, form controls (no inputs needed yet).

### App shell

- `src/components/layout` (sidebar, mobile drawer, header, skip link) and `src/config/navigation.ts`. Overview is available; Analytics, Automations, Moderation, Leaderboard and Settings render a "Coming soon" page that names the roadmap phase (ADR-014).
- Header shows a demo-data indicator and a static "Guest" placeholder (no authentication exists).
- Not done: keyboard behaviour was reviewed in code and in the browser, but no automated accessibility audit (axe, Lighthouse) was run.

### Dashboard demo mode

- `src/features/dashboard`: deterministic demo data (ADR-013), stat cards with period-over-period deltas, membership growth (90 days) and activity (30 days) charts, activity feed, loading skeleton, error boundary with retry, empty states.
- The UI always labels the data as demo. Replacing it with real data is a Phase 4 change inside `getDashboardData()`.
- Not done: the error boundary and loading skeleton are covered by build and code review only; there is no test that triggers them. Charts are mocked in component tests (jsdom has no layout), so chart rendering was checked by eye only.
