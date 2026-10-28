# Graph Report - nexus  (2026-10-28)

## Corpus Check
- 350 files · ~268,756 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .example 1, .toml 1)

## Summary
- 2505 nodes · 4947 edges · 196 communities (182 shown, 14 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 133 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `992d60d0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- hig-lookup.md
- select.ts
- pull-hig.mjs
- Typography
- ingestion.ts
- Live Activities
- dependencies
- demo.ts
- Widgets
- devDependencies
- Apple Pay
- analytics-view.tsx
- Machine learning
- Apple Design Skill
- formatNumber
- scripts
- compilerOptions
- postgres
- App Clips
- The menu bar
- components.json
- Standard icons
- requireUser
- HIG reference lookup
- Color
- activity-feed.tsx
- Buttons
- Liquid Glass
- Sign in with Apple
- Button
- NEXUS
- Augmented reality
- File management
- Tablet (iPadOS)
- Toolbars
- Decisions
- getDb
- auth/index.ts
- Apple Pencil and Scribble
- Charts
- Design principles
- Designing for iPhone Duo
- Generative AI
- Inclusion
- Menus
- Playing haptics
- Privacy
- Search fields
- SF Symbols
- AirPlay
- Alerts
- App icons
- Apple In-App Purchase
- Dark Mode
- Gestures
- Toggles
- bot/index.ts
- retention.int.test.ts
- Accessibility
- App Shortcuts
- Layout
- Lists and tables
- Maps
- Notifications
- Settings
- Windows
- Code audit
- Context menus
- Designing for games
- Drag and drop
- Edit menus
- Materials
- Multitasking
- Playing audio
- Playing video
- Right to left
- Scroll views
- Segmented controls
- Sheets
- Siri
- Split views
- Virtual keyboards
- Architecture
- getDb
- eslint.config.mjs
- .prettierrc.json
- guild-select-form.tsx
- Boxes
- Controls
- Disclosure controls
- Game controls
- Gauges
- Going full screen
- Image views
- Keyboards
- Launching
- Motion
- Offering help
- Onboarding
- Page controls
- Pickers
- Progress indicators
- Sidebars
- Sliders
- Tab bars
- Tab views
- Text fields
- Charting data
- Entering data
- Focus and selection
- Images
- Labels
- Live-viewing apps
- Loading
- Managing accounts
- Managing notifications
- Pop-up buttons
- Popovers
- Pull-down buttons
- Searching
- Snippets
- Text views
- Undo and redo
- VoiceOver
- Writing
- Action sheets
- Activity views
- Branding
- Collaboration and sharing
- Collections
- Color wells
- iCloud
- Modality
- Panels
- Printing
- Rating indicators
- Steppers
- communities/index.ts
- Reglas del proyecto
- Cross-platform translation
- activity/queries.ts
- Combo boxes
- the-menu-bar.md
- playing-haptics.md
- activity-metrics.tsx
- NEXUS Discord bot
- image-views.md
- Project plan
- layout.md
- getEligibleGuilds
- Ratings and reviews
- Token fields
- Web views
- designing-for-games.md
- guilds.ts
- AGENTS.md
- .claude/CLAUDE.md
- Phase 3
- cn
- health/route.ts
- cn
- api.ts
- installation.ts
- fake-db.ts
- env.ts
- repository.ts
- tokens.ts
- prisma
- { GET, POST }
- vitest
- analytics/page.tsx
- installation.test.ts
- channel-sync.ts
- pure.ts
- analytics.ts
- analytics-page.test.tsx
- analytics-maintenance.ts
- queries.test.ts
- analytics.test.ts
- isAuthConfigured
- Phase 4
- bot-status.ts
- permissions.ts
- dashboard-page.test.tsx
- tokens.test.ts
- Phase 2
- @testing-library/react
- ResizeObserverStub

## God Nodes (most connected - your core abstractions)
1. `cn()` - 62 edges
2. `vitest` - 57 edges
3. `Decisions` - 39 edges
4. `getDb()` - 34 edges
5. `Button()` - 33 edges
6. `Card()` - 32 edges
7. `lucide-react` - 30 edges
8. `next` - 30 edges
9. `CardContent()` - 30 edges
10. `requireUser()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `ADR-033: Aggregation job: one transaction, advisory lock, late events` --references--> `createAggregationService()`  [INFERRED]
  docs/DECISIONS.md → src/bot/services/aggregation.ts
- `ADR-035: Scheduler for the analytics jobs` --references--> `createAnalyticsMaintenance()`  [INFERRED]
  docs/DECISIONS.md → src/bot/services/analytics-maintenance.ts
- `ADR-034: Raw-event retention with verified deletion` --references--> `createRetentionService()`  [INFERRED]
  docs/DECISIONS.md → src/bot/services/retention.ts
- `What to search for` --references--> `Button()`  [INFERRED]
  .claude/skills/apple-design/references/code-audit.md → src/components/ui/button.tsx
- `ADR-037: Analytics read side and `/analytics`` --references--> `MessageActivityChart()`  [INFERRED]
  docs/DECISIONS.md → src/features/dashboard/components/message-activity-chart.tsx

## Import Cycles
- None detected.

## Communities (196 total, 14 thin omitted)

### Community 0 - "hig-lookup.md"
Cohesion: 0.16
Nodes (4): Background tag reading, In-app tag reading, NFC, Platform considerations

### Community 1 - "select.ts"
Cohesion: 0.21
Nodes (8): ADR-020: Community selection, tenant isolation and the active-community cookie, isUniqueViolation(), persist(), selectCommunity(), SelectCommunityResult, snowflakeSchema, fake, guildsMock

### Community 2 - "pull-hig.mjs"
Cohesion: 0.06
Nodes (65): abstractOf(), ALL_PLATFORMS, anchorEntries(), anchorMapFor(), cellText(), collapseBlankLines(), collectReferences(), coveredPlatformsLine() (+57 more)

### Community 3 - "Typography"
Cohesion: 0.06
Nodes (33): AX1, AX2, AX3, AX4, AX5, Change log, Conveying hierarchy, Desktop (macOS) (+25 more)

### Community 4 - "ingestion.ts"
Cohesion: 0.11
Nodes (14): Allowlist, CachedCommunity, CommunityCache, createIngestion(), Ingestion, Classification, classifyMessage(), createRejectionCounter() (+6 more)

### Community 5 - "Live Activities"
Cohesion: 0.07
Nodes (28): Adding transitions and animating content updates, Anatomy, Best practices, CarPlay, CarPlay dimensions, Change log, Choosing colors, Compact (+20 more)

### Community 6 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, @auth/prisma-adapter@2.11.3, class-variance-authority@0.7.1, cn@0.5.0, discord.js@14.27.0, geist@1.8.2, lucide-react@1.63.0, next@16.4.3 (+18 more)

### Community 7 - "demo.ts"
Cohesion: 0.09
Nodes (31): ADR-013: Deterministic demo data behind `getDashboardData()`, DemoPage(), metadata, addDays(), buildDays(), buildDemoDashboardData(), buildFeed(), DayRecord (+23 more)

### Community 8 - "Widgets"
Cohesion: 0.08
Nodes (25): Accented, Accessory widgets, Adding interactivity, Anatomy, Appearances, Apple HomeView, Best practices, Change log (+17 more)

### Community 9 - "devDependencies"
Cohesion: 0.07
Nodes (40): clsx@2.1.1, description, devDependencies, jsdom@30.1.3, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3 (+32 more)

### Community 10 - "Apple Pay"
Cohesion: 0.09
Nodes (23): Apple Pay, Apple Pay button, Apple Pay mark, Black, Button size and position, Button styles, Button types, Change log (+15 more)

### Community 11 - "analytics-view.tsx"
Cohesion: 0.12
Nodes (37): Loading(), ChartSkeleton(), Loading(), Loading(), LoginPage(), metadata, SearchParams, ChartCardProps (+29 more)

### Community 12 - "Machine learning"
Cohesion: 0.10
Nodes (20): Attribution, Calibration, Change log, Confidence, Corrections, Critical or complementary, Dynamic or static, Explicit feedback (+12 more)

### Community 13 - "Apple Design Skill"
Cohesion: 0.10
Nodes (19): Always load, Apple Design Skill, Apple's design principles, Design improvement mode, Every page, by Apple's section, Lens 1: Accessibility (failures are Critical), Lens 2: Platform conventions (failures are usually High), Lens 3: Visual design and craft (findings are High or Medium) (+11 more)

### Community 14 - "formatNumber"
Cohesion: 0.09
Nodes (43): ADR-012: Recharts through the shadcn `chart` primitive, recharts, ChartCard(), SrDataTable(), SrDataTableProps, ChartConfig, ChartContainer(), ChartContext (+35 more)

### Community 15 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, bot:dev, bot:start, build, check, db:deploy, db:down, db:generate (+15 more)

### Community 16 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 17 - "postgres"
Cohesion: 0.11
Nodes (18): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+10 more)

### Community 18 - "App Clips"
Cohesion: 0.11
Nodes (18): App Clip Codes, App Clips, Change log, Creating App Clips for businesses, Creating content for an App Clip card, Customizing your App Clip Code, Designing your App Clip, Displaying App Clip Codes (+10 more)

### Community 19 - "The menu bar"
Cohesion: 0.11
Nodes (18): Anatomy, App menu, App-specific menus, Best practices, Change log, Desktop (macOS), Dynamic menu items, Edit menu (+10 more)

### Community 20 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 21 - "Standard icons"
Cohesion: 0.12
Nodes (17): Best practices, Change log, Desktop (macOS), Document icons, Editing, Icons, Layer ordering, Other (+9 more)

### Community 22 - "requireUser"
Cohesion: 0.20
Nodes (11): Active community cookie, Authentication and authorization, Discord token storage and refresh, Route protection model, Session strategy, Sign-in flow, Tenant isolation, ADR-016: Database sessions, minimal public session, server-side authorization (+3 more)

### Community 23 - "HIG reference lookup"
Cohesion: 0.12
Nodes (16): Components › Content, Components › Layout and organization, Components › Menus and actions, Components › Navigation and search, Components › Presentation, Components › Selection and input, Components › Status, Components › System experiences (+8 more)

### Community 24 - "Color"
Cohesion: 0.13
Nodes (15): App accent colors, Best practices, Change log, Color, Color management, Desktop (macOS), Inclusive color, iOS, iPadOS system gray colors (+7 more)

### Community 25 - "activity-feed.tsx"
Cohesion: 0.16
Nodes (17): Dashboard demo mode, Design system and UI, Tokens, Typography, ActivityFeed(), ActivityFeedProps, eventMeta, DashboardView() (+9 more)

### Community 26 - "Buttons"
Cohesion: 0.14
Nodes (14): Best practices, Buttons, Change log, Content, Desktop (macOS), Help buttons, Image buttons, Mobile (iOS, iPadOS) (+6 more)

### Community 27 - "Liquid Glass"
Cohesion: 0.14
Nodes (14): Apple's rules, Color on glass, Cross-platform translation, Flutter, Liquid Glass, React Native, Related guidelines, Review checklist (+6 more)

### Community 28 - "Sign in with Apple"
Cohesion: 0.14
Nodes (14): Black, Button size and corner radius, Change log, Collecting data, Creating a custom Sign in with Apple button, Custom buttons with a logo and text, Custom logo-only buttons, Displaying buttons (+6 more)

### Community 29 - "Button"
Cohesion: 0.15
Nodes (24): ADR-024: Onboarding and Overview states, nextConfig, lucide-react, next, react, DashboardError(), ProtectedError(), EmptyState() (+16 more)

### Community 30 - "NEXUS"
Cohesion: 0.10
Nodes (20): Analytics, App shell, Current limitations, Database, Demo mode, Design system, Discord application setup, Documentation (+12 more)

### Community 31 - "Augmented reality"
Cohesion: 0.15
Nodes (13): Augmented reality, Best practices, Communicating with people, Designing object interactions, Handling interruptions, Helping people place objects, Icons and badges, Offering a multiuser experience (+5 more)

### Community 32 - "File management"
Cohesion: 0.15
Nodes (13): Change log, Creating and opening files, Custom file management, Desktop (macOS), Document launcher, File management, File provider app extension, Finder Sync extensions (+5 more)

### Community 33 - "Tablet (iPadOS)"
Cohesion: 0.15
Nodes (13): Best practices, Change log, Customizing pointers, Desktop (macOS), Platform considerations, Pointer accessories, Pointer magnetism, Pointer shape and content effects (+5 more)

### Community 34 - "Toolbars"
Cohesion: 0.17
Nodes (12): Actions, Best practices, Change log, Desktop (macOS), Item groupings, Navigation, Phone (iOS), Platform considerations (+4 more)

### Community 35 - "Decisions"
Cohesion: 0.08
Nodes (25): ADR-001: npm as package manager, ADR-002: Single package at the repo root, no workspaces, ADR-003: Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui, ADR-004: Pin TypeScript 6 and ESLint 9, ADR-005: Prisma 7.10.1 (stable), not the 8.0 release candidate, ADR-006: Initial schema is only User, Community, CommunityMembership, ADR-008: Health (liveness) and ready (readiness) split, ADR-009: Initial migration generated without a database (+17 more)

### Community 36 - "getDb"
Cohesion: 0.20
Nodes (14): RFC-9207, next-auth@5.0.0-beta.32, next-auth, buildAuthConfig(), DISCORD_SCOPES, DiscordProfileInput, discordProfileSchema, mapDiscordProfile() (+6 more)

### Community 37 - "auth/index.ts"
Cohesion: 0.27
Nodes (7): auth, handlers, DbUserLike, PublicSession, PublicUser, getCurrentUser, mocks

### Community 38 - "Apple Pencil and Scribble"
Cohesion: 0.18
Nodes (11): Apple Pencil and Scribble, Barrel roll, Best practices, Change log, Custom drawing, Double tap, Hover, Platform considerations (+3 more)

### Community 39 - "Charts"
Cohesion: 0.18
Nodes (11): Anatomy, Axes, Best practices, Change log, Charts, Color, Descriptive content, Enhancing the accessibility of a chart (+3 more)

### Community 40 - "Design principles"
Cohesion: 0.18
Nodes (10): Agency, Change log, Craft, Delight, Design principles, Familiarity, Flexibility, Purpose (+2 more)

### Community 41 - "Designing for iPhone Duo"
Cohesion: 0.18
Nodes (11): Anatomy, Arrangement views, Best practices, Change log, Designing for iPhone Duo, Device poses, Dynamic layouts, Related guidelines (+3 more)

### Community 42 - "Generative AI"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Continuous improvement, Generative AI, Inputs, Models and datasets, Outputs, Platform considerations (+3 more)

### Community 43 - "Inclusion"
Cohesion: 0.18
Nodes (11): Accessibility, Avoiding stereotypes, Being approachable, Gender identity, Inclusion, Inclusive by design, Languages, People and settings (+3 more)

### Community 44 - "Menus"
Cohesion: 0.18
Nodes (11): Change log, Icons, In-game menus, Labels, Menus, Mobile (iOS, iPadOS), Organization, Platform considerations (+3 more)

### Community 45 - "Playing haptics"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Custom haptics, Desktop (macOS), Impact, Notification, Phone (iOS), Platform considerations (+3 more)

### Community 46 - "Privacy"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Desktop (macOS), Location button, Platform considerations, Pre-alert screens, windows, or views, Privacy, Protecting data (+3 more)

### Community 47 - "Search fields"
Cohesion: 0.18
Nodes (11): Best practices, Change log, Phone (iOS), Platform considerations, Related guidelines, Scope bars and tokens, Search as a tab, Search as an inline field (+3 more)

### Community 48 - "SF Symbols"
Cohesion: 0.18
Nodes (11): Animations, Change log, Custom symbols, Design variants, Gradients, Platform considerations, Related guidelines, Rendering modes (+3 more)

### Community 49 - "AirPlay"
Cohesion: 0.20
Nodes (9): AirPlay, Best practices, Black AirPlay icon, Change log, Custom color AirPlay icon, Platform considerations, Referring to AirPlay, Using AirPlay icons (+1 more)

### Community 50 - "Alerts"
Cohesion: 0.20
Nodes (10): Alerts, Anatomy, Best practices, Buttons, Change log, Content, Desktop (macOS), Mobile (iOS, iPadOS) (+2 more)

### Community 51 - "App icons"
Cohesion: 0.20
Nodes (10): App icons, Appearances, Change log, Design, Icon shape, Layer design, Platform considerations, Related guidelines (+2 more)

### Community 52 - "Apple In-App Purchase"
Cohesion: 0.20
Nodes (10): Apple In-App Purchase, Auto-renewable subscriptions, Best practices, Change log, Helping people manage their subscriptions, Making signup effortless, Platform considerations, Providing help (+2 more)

### Community 53 - "Dark Mode"
Cohesion: 0.20
Nodes (10): Best practices, Change log, Dark Mode, Dark Mode colors, Desktop (macOS), Icons and images, Mobile (iOS, iPadOS), Platform considerations (+2 more)

### Community 54 - "Gestures"
Cohesion: 0.20
Nodes (10): Best practices, Change log, Custom gestures, Desktop (macOS), Gestures, Mobile (iOS, iPadOS), Platform considerations, Related guidelines (+2 more)

### Community 55 - "Toggles"
Cohesion: 0.20
Nodes (10): Best practices, Change log, Checkboxes, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Radio buttons, Related guidelines (+2 more)

### Community 56 - "bot/index.ts"
Cohesion: 0.14
Nodes (23): discord.js, BOT_INTENTS, createBotClient(), createChannelDirectory(), createGuildDirectory(), registerLifecycleHandlers(), registerMessageHandler(), main() (+15 more)

### Community 57 - "retention.int.test.ts"
Cohesion: 0.14
Nodes (25): AggregationResult, createAggregationService(), LATE_EVENT_MARGIN_MS, DEFAULT_DELETE_BATCH_SIZE, DEFAULT_MAX_DELETE_BATCHES, RetentionResult, createTestPrisma(), hasTestDatabase (+17 more)

### Community 58 - "Accessibility"
Cohesion: 0.22
Nodes (9): Accessibility, Change log, Cognitive, Hearing, Mobility, Platform considerations, Related guidelines, Speech (+1 more)

### Community 59 - "App Shortcuts"
Cohesion: 0.22
Nodes (9): App Shortcuts, Best practices, Change log, Desktop (macOS), Editorial guidelines, Mobile (iOS, iPadOS), Platform considerations, Related guidelines (+1 more)

### Community 60 - "Layout"
Cohesion: 0.22
Nodes (9): Adaptability, Change log, Desktop (macOS), Guides and safe areas, Layout, Platform considerations, Related guidelines, Size classes (+1 more)

### Community 61 - "Lists and tables"
Cohesion: 0.22
Nodes (9): Best practices, Change log, Content, Desktop (macOS), Lists and tables, Mobile (iOS, iPadOS, visionOS), Platform considerations, Related guidelines (+1 more)

### Community 62 - "Maps"
Cohesion: 0.22
Nodes (9): Adding place cards outside of a map, Best practices, Change log, Custom information, Displaying place cards in a map, Indoor maps, Maps, Place cards (+1 more)

### Community 63 - "Notifications"
Cohesion: 0.22
Nodes (9): Anatomy, Badging, Best practices, Change log, Content, Notification actions, Notifications, Platform considerations (+1 more)

### Community 64 - "Settings"
Cohesion: 0.22
Nodes (9): Best practices, Change log, Desktop (macOS), General settings, Platform considerations, Related guidelines, Settings, System settings (+1 more)

### Community 65 - "Windows"
Cohesion: 0.22
Nodes (9): Best practices, Change log, Desktop (macOS), macOS window anatomy, macOS window states, Platform considerations, Related guidelines, Tablet (iPadOS) (+1 more)

### Community 66 - "Code audit"
Cohesion: 0.25
Nodes (7): Apple Pay and payment marks, Code audit, How to run it, iPhone Duo readiness in code, Liquid Glass in code, What replaces it, What to search for

### Community 67 - "Context menus"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Content, Context menus, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 68 - "Designing for games"
Cohesion: 0.25
Nodes (8): Adopt Apple technologies, Change log, Designing for games, Enable intuitive interactions, Jump into gameplay, Look stunning on every display, Related guidelines, Welcome everyone

### Community 69 - "Drag and drop"
Cohesion: 0.25
Nodes (8): Accepting drops, Best practices, Change log, Desktop (macOS), Drag and drop, Mobile (iOS, iPadOS), Platform considerations, Providing feedback

### Community 70 - "Edit menus"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Content, Desktop (macOS), Edit menus, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 71 - "Materials"
Cohesion: 0.25
Nodes (8): Change log, Desktop (macOS), Liquid Glass, Materials, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Standard materials

### Community 72 - "Multitasking"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Multitasking, Phone (iOS), Platform considerations, Related guidelines, Tablet (iPadOS)

### Community 73 - "Playing audio"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Handling interruptions, Mobile (iOS, iPadOS), Platform considerations, Playing audio, Related guidelines

### Community 74 - "Playing video"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Exiting playback, Integrating with the TV app, Loading content, Platform considerations, Playing video, Related guidelines

### Community 75 - "Right to left"
Cohesion: 0.25
Nodes (8): Controls, Images, Interface icons, Numbers and characters, Platform considerations, Related guidelines, Right to left, Text alignment

### Community 76 - "Scroll views"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Scroll edge effects, Scroll views

### Community 77 - "Segmented controls"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Content, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Segmented controls

### Community 78 - "Sheets"
Cohesion: 0.25
Nodes (8): Anatomy, Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Sheets

### Community 79 - "Siri"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Customizing your app’s experience with Siri, Editorial guidelines, Getting your app to work with Siri, Related guidelines, Sharing contextual information, Siri

### Community 80 - "Split views"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Desktop (macOS), Phone (iOS), Platform considerations, Related guidelines, Split views, Tablet (iPadOS)

### Community 81 - "Virtual keyboards"
Cohesion: 0.25
Nodes (8): Best practices, Change log, Custom input views, Custom keyboards, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Virtual keyboards

### Community 82 - "Architecture"
Cohesion: 0.14
Nodes (14): Architecture, Bot status model, Data flow, Data flow (current), Database access, Database boundary, Directory layout, Discord bot process (+6 more)

### Community 83 - "getDb"
Cohesion: 0.16
Nodes (12): ADR-025: A framework-agnostic Prisma core; `server-only` stays on the web entry, @prisma/adapter-pg@7.10.1, @prisma/adapter-pg, dynamic, GET(), pingDatabase(), createPrismaClient(), getPrismaClient() (+4 more)

### Community 84 - "eslint.config.mjs"
Cohesion: 0.25
Nodes (7): eslintConfig, eslint@9.39.5, eslint-config-next@16.4.3, eslint-config-prettier@10.1.8, eslint, eslint-config-next, eslint-config-prettier

### Community 85 - ".prettierrc.json"
Cohesion: 0.25
Nodes (7): plugins, printWidth, semi, singleQuote, tailwindFunctions, tailwindStylesheet, trailingComma

### Community 86 - "guild-select-form.tsx"
Cohesion: 0.24
Nodes (11): MESSAGES, selectCommunityAction(), GuildSelectForm(), formatSeconds(), retrySeconds(), selectErrorMessage(), initialSelectCommunityState, SelectCommunityErrorCode (+3 more)

### Community 87 - "Boxes"
Cohesion: 0.29
Nodes (7): Best practices, Boxes, Content, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 88 - "Controls"
Cohesion: 0.29
Nodes (7): Anatomy, Best practices, Camera experiences on a locked device, Change log, Controls, Platform considerations, Related guidelines

### Community 89 - "Disclosure controls"
Cohesion: 0.29
Nodes (7): Best practices, Disclosure buttons, Disclosure controls, Disclosure triangles, Mobile (iOS, iPadOS, visionOS), Platform considerations, Related guidelines

### Community 90 - "Game controls"
Cohesion: 0.29
Nodes (7): Change log, Game controls, Keyboards, Physical controllers, Platform considerations, Related guidelines, Touch controls

### Community 91 - "Gauges"
Cohesion: 0.29
Nodes (7): Anatomy, Best practices, Change log, Desktop (macOS), Gauges, Platform considerations, Related guidelines

### Community 92 - "Going full screen"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Going full screen, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 93 - "Image views"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Content, Desktop (macOS), Image views, Platform considerations, Related guidelines

### Community 94 - "Keyboards"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Custom keyboard shortcuts, Keyboards, Platform considerations, Related guidelines, Standard keyboard shortcuts

### Community 95 - "Launching"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Launch screens, Launching, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 96 - "Motion"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Leveraging platform capabilities, Motion, Platform considerations, Providing feedback, Related guidelines

### Community 97 - "Offering help"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Creating tips, Desktop (macOS, visionOS), Offering help, Platform considerations, Related guidelines

### Community 98 - "Onboarding"
Cohesion: 0.29
Nodes (7): Additional content, Additional requests, Best practices, Change log, Onboarding, Platform considerations, Related guidelines

### Community 99 - "Page controls"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Customizing indicators, Mobile (iOS, iPadOS), Page controls, Platform considerations, Related guidelines

### Community 100 - "Pickers"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Pickers, Platform considerations, Related guidelines

### Community 101 - "Progress indicators"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Progress indicators, Refresh content controls

### Community 102 - "Sidebars"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Sidebars

### Community 103 - "Sliders"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Sliders

### Community 104 - "Tab bars"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Phone (iOS), Platform considerations, Related guidelines, Tab bars, Tablet (iPadOS)

### Community 105 - "Tab views"
Cohesion: 0.29
Nodes (7): Anatomy, Best practices, Change log, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Tab views

### Community 106 - "Text fields"
Cohesion: 0.29
Nodes (7): Best practices, Change log, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Text fields

### Community 107 - "Charting data"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Charting data, Designing effective charts, Platform considerations, Related guidelines

### Community 108 - "Entering data"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Desktop (macOS), Entering data, Platform considerations, Related guidelines

### Community 109 - "Focus and selection"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Focus and selection, Platform considerations, Related guidelines, Tablet (iPadOS)

### Community 110 - "Images"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Formats, Images, Platform considerations, Resolution

### Community 111 - "Labels"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Desktop (macOS), Labels, Platform considerations, Related guidelines

### Community 112 - "Live-viewing apps"
Cohesion: 0.33
Nodes (6): Best practices, Cloud DVR, EPG experience, Live-viewing apps, Platform considerations, Related guidelines

### Community 113 - "Loading"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Loading, Platform considerations, Related guidelines, Showing progress

### Community 114 - "Managing accounts"
Cohesion: 0.33
Nodes (6): Best practices, Deleting accounts, Managing accounts, Platform considerations, Related guidelines, TV provider accounts

### Community 115 - "Managing notifications"
Cohesion: 0.33
Nodes (6): Best practices, Integrating with Focus, Managing notifications, Platform considerations, Related guidelines, Sending marketing notifications

### Community 116 - "Pop-up buttons"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Platform considerations, Pop-up buttons, Related guidelines, Tablet (iPadOS)

### Community 117 - "Popovers"
Cohesion: 0.33
Nodes (6): Best practices, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Popovers, Related guidelines

### Community 118 - "Pull-down buttons"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Mobile (iOS, iPadOS), Platform considerations, Pull-down buttons, Related guidelines

### Community 119 - "Searching"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Platform considerations, Related guidelines, Searching, Systemwide search

### Community 120 - "Snippets"
Cohesion: 0.33
Nodes (6): Anatomy, Best practices, Change log, Platform considerations, Related guidelines, Snippets

### Community 121 - "Text views"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Text views

### Community 122 - "Undo and redo"
Cohesion: 0.33
Nodes (6): Best practices, Desktop (macOS), Mobile (iOS, iPadOS), Platform considerations, Related guidelines, Undo and redo

### Community 123 - "VoiceOver"
Cohesion: 0.33
Nodes (6): Change log, Descriptions, Navigation, Platform considerations, Related guidelines, VoiceOver

### Community 124 - "Writing"
Cohesion: 0.33
Nodes (6): Best practices, Change log, Getting started, Platform considerations, Related guidelines, Writing

### Community 125 - "Action sheets"
Cohesion: 0.40
Nodes (5): Action sheets, Best practices, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 126 - "Activity views"
Cohesion: 0.40
Nodes (5): Activity views, Best practices, Platform considerations, Related guidelines, Share and action extensions

### Community 127 - "Branding"
Cohesion: 0.40
Nodes (5): Best practices, Branding, Change log, Platform considerations, Related guidelines

### Community 128 - "Collaboration and sharing"
Cohesion: 0.40
Nodes (5): Best practices, Change log, Collaboration and sharing, Platform considerations, Related guidelines

### Community 129 - "Collections"
Cohesion: 0.40
Nodes (5): Best practices, Collections, Mobile (iOS, iPadOS), Platform considerations, Related guidelines

### Community 130 - "Color wells"
Cohesion: 0.40
Nodes (5): Best practices, Color wells, Desktop (macOS), Platform considerations, Related guidelines

### Community 131 - "iCloud"
Cohesion: 0.40
Nodes (4): Best practices, Change log, iCloud, Platform considerations

### Community 132 - "Modality"
Cohesion: 0.40
Nodes (5): Best practices, Change log, Modality, Platform considerations, Related guidelines

### Community 133 - "Panels"
Cohesion: 0.40
Nodes (5): Best practices, HUD-style panels, Panels, Platform considerations, Related guidelines

### Community 134 - "Printing"
Cohesion: 0.40
Nodes (5): Best practices, Desktop (macOS), Platform considerations, Printing, Related guidelines

### Community 135 - "Rating indicators"
Cohesion: 0.40
Nodes (5): Best practices, Change log, Platform considerations, Rating indicators, Related guidelines

### Community 136 - "Steppers"
Cohesion: 0.40
Nodes (5): Best practices, Desktop (macOS), Platform considerations, Related guidelines, Steppers

### Community 137 - "communities/index.ts"
Cohesion: 0.18
Nodes (18): Mocked (automated tests; Discord and, mostly, the database are replaced), HeaderAccount(), loadMenuProps(), UserMenuProps, ActivityContext, ACTIVE_COMMUNITY_COOKIE, clearActiveCommunityCookie(), getActiveCommunity (+10 more)

### Community 138 - "Reglas del proyecto"
Cohesion: 0.25
Nodes (7): Estado del proyecto (actualizar al terminar cada fase), Forma de trabajar, graphify, Idioma, Modelos y subagentes, Puesta en marcha en otro ordenador, Reglas del proyecto

### Community 139 - "Cross-platform translation"
Cohesion: 0.50
Nodes (3): Conventions to check, Cross-platform translation, Vocabulary

### Community 140 - "activity/queries.ts"
Cohesion: 0.19
Nodes (24): ADR-031: Overview data: honest activity summary, createRetentionService(), addUtcDays(), startOfUtcDay(), getAnalyticsData(), isAggregationStale(), rangeStart(), rawStart() (+16 more)

### Community 141 - "Combo boxes"
Cohesion: 0.50
Nodes (4): Best practices, Combo boxes, Platform considerations, Related guidelines

### Community 142 - "the-menu-bar.md"
Cohesion: 0.11
Nodes (15): Best practices, Dock menus, Platform considerations, Related guidelines, Best practices, Home Screen quick actions, Platform considerations, Related guidelines (+7 more)

### Community 143 - "playing-haptics.md"
Cohesion: 0.15
Nodes (8): Best practices, Feedback, Platform considerations, Related guidelines, Best practices, Gyroscope and accelerometer, Platform considerations, Related guidelines

### Community 144 - "activity-metrics.tsx"
Cohesion: 0.21
Nodes (12): Demo separation, changeStyles, StatCard(), StatCardProps, StatChange, ActivityMetrics(), Id(), RecentActivity() (+4 more)

### Community 145 - "NEXUS Discord bot"
Cohesion: 0.13
Nodes (15): Allowlist: which server ids, Analytics maintenance (Phase 4), Architecture, Environment variables, Heartbeat semantics, Intents and why, Invite with minimal permissions, Manual test plan (server CAPTURAS) (+7 more)

### Community 146 - "image-views.md"
Cohesion: 0.20
Nodes (4): Best practices, Image wells, Platform considerations, Related guidelines

### Community 147 - "Project plan"
Cohesion: 0.20
Nodes (10): Out of scope (for now), Phase 1 - Technical foundation (done), Phase 2 - Discord OAuth2 and real communities (implemented, pending live Discord check), Phase 3 - Bot process and message ingestion (implemented, pending live Discord check), Phase 4 - Analytics from real data (implemented, pending live check), Phase 5 - Automations (rules), Phase 6 - Moderation and audit logs, Phase 7 - XP and leaderboards (+2 more)

### Community 148 - "layout.md"
Cohesion: 0.15
Nodes (8): Best practices, Column views, Platform considerations, Related guidelines, Best practices, Outline views, Platform considerations, Related guidelines

### Community 149 - "getEligibleGuilds"
Cohesion: 0.31
Nodes (5): metadata, OnboardingPage(), getEligibleGuilds(), mocks, renderPage()

### Community 150 - "Ratings and reviews"
Cohesion: 0.50
Nodes (4): Best practices, Change log, Platform considerations, Ratings and reviews

### Community 151 - "Token fields"
Cohesion: 0.40
Nodes (4): Best practices, Platform considerations, Related guidelines, Token fields

### Community 152 - "Web views"
Cohesion: 0.50
Nodes (3): Best practices, Platform considerations, Web views

### Community 153 - "designing-for-games.md"
Cohesion: 0.19
Nodes (6): Best practices, Designing for iOS, Best practices, Designing for iPadOS, Best practices, Designing for macOS

### Community 154 - "guilds.ts"
Cohesion: 0.19
Nodes (12): FetchGuildsOptions, buildGuildIconUrl(), EligibleGuild, EligibleGuildsResult, GuildServiceOptions, REASON_ORDER, EligibilityReason, TokenOptions (+4 more)

### Community 157 - "Phase 3"
Cohesion: 0.33
Nodes (6): Known gaps and follow-ups, Mocked (automated tests with fakes), Not verified, Phase 3, Verified (a real command or run observed it), Verified live against Discord (2026-10-28, test server CAPTURAS)

### Community 159 - "cn"
Cohesion: 0.16
Nodes (23): radix-ui, Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), CardAction() (+15 more)

### Community 161 - "cn"
Cohesion: 0.06
Nodes (47): ADR-0021, App shell, ADR-014: Navigation config with a `"soon"` status, ADR-022: The demo state is per route, not a global switch, AppLayout(), AutomationsPage(), metadata, LeaderboardPage() (+39 more)

### Community 162 - "api.ts"
Cohesion: 0.15
Nodes (10): attempt(), AttemptResult, DiscordApiError, DiscordGuild, fetchCurrentUserGuilds(), FetchGuildsResult, guildSchema, guildsSchema (+2 more)

### Community 163 - "installation.ts"
Cohesion: 0.11
Nodes (7): ADR-026: Bot runtime: discord.js 14.27.0, tsx, minimal intents, separate process, registerGuildHandlers(), Heartbeat, GuildDirectory, GuildPresence, InstallationService, BotRepository

### Community 164 - "fake-db.ts"
Cohesion: 0.12
Nodes (14): ADR-023: Account menu in the header and a membership-only community switcher, switchActiveCommunityAction(), fake, mocks, run(), AccountRow, CommunityRow, createFakeDb() (+6 more)

### Community 165 - "env.ts"
Cohesion: 0.23
Nodes (10): ADR-007: Lazy environment validation, zod@4.6.7, zod, AuthEnv, authEnvSchema, getEnv(), parseEnv(), resetEnvCache() (+2 more)

### Community 167 - "repository.ts"
Cohesion: 0.10
Nodes (14): vitest, BatchWriter, createBatchWriter(), DEFAULT_FLUSH_INTERVAL_MS, DEFAULT_MAX_BACKOFF_MS, DEFAULT_MAX_BATCH, DEFAULT_MAX_BUFFER, DEFAULT_STOP_TIMEOUT_MS (+6 more)

### Community 170 - "tokens.ts"
Cohesion: 0.24
Nodes (10): DISCORD_API_BASE, accountSelect, DiscordTokenResult, getValidDiscordAccessToken(), hasGuildsScope(), isExpired(), RefreshOutcome, refreshResponseSchema (+2 more)

### Community 174 - "vitest"
Cohesion: 0.16
Nodes (16): BotConfig, BotConfigError, DEFAULT_RETENTION_DAYS, MAX_HEARTBEAT_INTERVAL_MS, MAX_RETENTION_DAYS, MIN_HEARTBEAT_INTERVAL_MS, MIN_RETENTION_DAYS, nonEmpty() (+8 more)

### Community 175 - "analytics/page.tsx"
Cohesion: 0.31
Nodes (10): AnalyticsPage(), metadata, metadata, OverviewPage(), navMetadata(), OverviewUnavailable(), BOT_INVITE_PERMISSIONS, buildBotInviteUrl() (+2 more)

### Community 176 - "installation.test.ts"
Cohesion: 0.27
Nodes (13): createAllowlist(), createCommunityCache(), silentLogger, setup(), AT, setup(), beat(), setup() (+5 more)

### Community 177 - "channel-sync.ts"
Cohesion: 0.17
Nodes (8): ChannelSource, MESSAGE_CHANNEL_TYPES, registerChannelHandlers(), toChannelInfo(), ChannelDirectory, ChannelInfo, ChannelRepository, ChannelSync

### Community 178 - "pure.ts"
Cohesion: 0.15
Nodes (17): Mocked (automated tests with fakes), DEFAULT_RANGE, parseRange(), RANGES, rangeSchema, DAY_MS, utcDayKey(), utcDayRange() (+9 more)

### Community 179 - "analytics.ts"
Cohesion: 0.15
Nodes (22): Analytics pipeline, server-only, RangeDays, BotStatus, ANALYTICS_RECENT_LIMIT, AnalyticsActivity, AnalyticsCoverage, AnalyticsData (+14 more)

### Community 180 - "analytics-page.test.tsx"
Cohesion: 0.28
Nodes (8): community, d(), heatmap(), mocks, NOW, ok(), renderPage(), user

### Community 181 - "analytics-maintenance.ts"
Cohesion: 0.11
Nodes (11): AggregationService, ANALYTICS_INTERVAL_MS, AnalyticsMaintenance, createAnalyticsMaintenance(), RunSummary, BatchWriterOptions, Logger, RetentionService (+3 more)

### Community 183 - "queries.test.ts"
Cohesion: 0.18
Nodes (9): Call, D7, db, H24, NOW, routeRaw(), sql(), T0 (+1 more)

### Community 185 - "analytics.test.ts"
Cohesion: 0.29
Nodes (4): FIRST, mocks, NOW, W

### Community 186 - "isAuthConfigured"
Cohesion: 0.24
Nodes (10): Layering, ADR-015: Auth.js v5 with the Prisma adapter, signInWithDiscordAction(), signOutAction(), loginErrorMessage(), MESSAGES, safeRedirectPath(), isAuthConfigured() (+2 more)

### Community 187 - "Phase 4"
Cohesion: 0.25
Nodes (8): Known gaps and follow-ups, Not implemented yet (by design), Not verified, Phase 1 (done and verified), Phase 4, Progress, Verified (a real command or run observed it), Verified live against Discord (CAPTURAS, `npm run bot:start` started by the developer)

### Community 188 - "bot-status.ts"
Cohesion: 0.32
Nodes (5): BOT_HEARTBEAT_STALE_AFTER_MS, BotStatusFields, getBotStatus(), botConnectedAt, now

### Community 189 - "permissions.ts"
Cohesion: 0.54
Nodes (6): ADMINISTRATOR, getEligibility(), hasPermission(), isEligibleGuild(), MANAGE_GUILD, parsePermissions()

### Community 190 - "dashboard-page.test.tsx"
Cohesion: 0.29
Nodes (7): community(), data(), emptySummary, mocks, NOW, renderPage(), user

### Community 191 - "tokens.test.ts"
Cohesion: 0.29
Nodes (3): fake, NOW_MS, NOW_S

### Community 193 - "Phase 2"
Cohesion: 0.33
Nodes (6): Automated checks, Known gaps and follow-ups, Not verified, Phase 2, Verified live with a real Discord application (2026-10-28, `npm run dev`), Verified (observed against real services)

### Community 194 - "@testing-library/react"
Cohesion: 0.40
Nodes (3): @testing-library/react@16.3.3, @testing-library/react, refresh

## Knowledge Gaps
- **3 isolated node(s):** `ADR-0021`, `RFC-9207`, `{ GET, POST }`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1305 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `repository.ts` to `select.ts`, `ingestion.ts`, `demo.ts`, `devDependencies`, `communities/index.ts`, `analytics-view.tsx`, `activity/queries.ts`, `formatNumber`, `getEligibleGuilds`, `activity-feed.tsx`, `guilds.ts`, `Button`, `cn`, `health/route.ts`, `cn`, `api.ts`, `fake-db.ts`, `env.ts`, `getDb`, `auth/index.ts`, `vitest`, `analytics/page.tsx`, `installation.test.ts`, `pure.ts`, `analytics.ts`, `analytics-page.test.tsx`, `analytics-maintenance.ts`, `queries.test.ts`, `bot/index.ts`, `retention.int.test.ts`, `isAuthConfigured`, `analytics.test.ts`, `bot-status.ts`, `permissions.ts`, `dashboard-page.test.tsx`, `tokens.test.ts`, `@testing-library/react`, `getDb`, `guild-select-form.tsx`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `cn()` (e.g. with `Design system and UI` and `ADR-003: Next.js App Router, TypeScript strict, Tailwind v4, shadcn/ui`) actually correct?**
  _`cn()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0021`, `RFC-9207`, `{ GET, POST }` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pull-hig.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.06308610400682012 - nodes in this community are weakly interconnected._
- **Why does `Decisions` connect `Decisions` to `README.md`, `cn`, `select.ts`, `installation.ts`, `fake-db.ts`, `env.ts`, `demo.ts`, `activity/queries.ts`, `formatNumber`, `getDb`, `requireUser`, `isAuthConfigured`, `Button`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `getDb()` (e.g. with `Database access` and `Database boundary`) actually correct?**
  _`getDb()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `Typography` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._