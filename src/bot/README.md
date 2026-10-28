# NEXUS Discord bot

The bot is a **separate, long-running Node process** in the same package as the
web app (`src/bot/index.ts`, run with `tsx`). It is not part of `next build` or
`next dev`; nothing starts it automatically.

What it does, and nothing more:

1. Connects to the Discord Gateway.
2. Records **metadata** of the messages sent in allowlisted servers that already
   exist in NEXUS (a row per message in `message_events`).
3. Tells the database whether it is installed in each of those servers
   (`communities.bot_connected_at`) and that it is alive
   (`communities.bot_last_seen_at`, a heartbeat).

The web app reads those rows to show the bot status and the activity numbers on
the Overview. It never talks to the bot directly: the database is the only
interface between the two processes.

## Architecture

```
Discord Gateway
   |  (discord.js, intents Guilds + GuildMessages)
   v
handlers/            thin: map discord.js objects to ids and delegate
   |   guilds.ts      guildCreate / guildDelete -> installation service
   |   messages.ts    messageCreate             -> ingestion
   |   lifecycle.ts   ready, shard disconnect/resume, errors -> logs
   v
services/            no discord.js imports; talk to a narrow BotRepository
   |   allowlist       parse and apply DISCORD_GUILD_ALLOWLIST (fail closed)
   |   message-events  classify a message, keep only 4 fields, count rejections
   |   ingestion       classify + enqueue
   |   batch-writer    buffered, idempotent, retrying, bounded
   |   installation    reconcile on ready, connect / disconnect a community
   |   community-cache guild id -> community id for the allowlisted guilds
   |   heartbeat       refresh cache, connect late communities, touch last-seen
   |   repository      the only code that talks to Prisma
   v
PostgreSQL (shared Prisma core: src/server/db/prisma.ts)
   ^
   |  read-only queries: src/server/activity (server-only)
Next.js web app (Overview)
```

Boundaries (enforced by ESLint): `src/bot` may import `src/lib`, `src/generated`
and `@/server/db/prisma` (the framework-agnostic Prisma core). It must not import
`@/server/db` (the `server-only` entry), `@/server/auth` or `next/*`, because
`server-only` throws outside React Server environments. `src/app`, `src/server`
and `src/lib` must not import `@/bot/**`.

Exit codes: `0` clean shutdown, `1` runtime failure (login failed, unhandled
error), `2` invalid configuration.

## Environment variables

Read from the process environment; the scripts also load `.env` if it exists.

| Variable                    | Required      | Notes                                                                                                                                    |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_BOT_TOKEN`         | Yes           | Developer Portal -> your application -> **Bot** -> Reset Token. Only the bot reads it; never commit it.                                  |
| `DATABASE_URL`              | Yes           | Same PostgreSQL as the web app.                                                                                                          |
| `DISCORD_GUILD_ALLOWLIST`   | To store data | Comma-separated server ids (17 to 20 digits). Empty or missing: the bot logs in but stores nothing. An invalid entry is a startup error. |
| `BOT_HEARTBEAT_INTERVAL_MS` | No            | Default `60000`; bounded to 5000-120000.                                                                                                 |

The web app needs no new variable: the invite link reuses the public OAuth
Client ID (`AUTH_DISCORD_ID`).

## Intents and why

Exactly two, in `client.ts`:

- `Guilds`: `guildCreate` / `guildDelete` (installation tracking) and the guild
  cache.
- `GuildMessages`: `messageCreate` events.

Not requested, on purpose: `MessageContent`, `GuildMembers`, `GuildPresences`
(privileged intents, not needed). Without `MessageContent` Discord does not send
the text of ordinary messages to the bot at all, which backs the privacy rule
below. The message cache is disabled: messages are processed as they arrive and
never retained.

## What is stored

One row per accepted message in `message_events`, exactly these fields:

| Field              | Meaning                                        |
| ------------------ | ---------------------------------------------- |
| `discordMessageId` | Message id (unique, so resends are idempotent) |
| `discordGuildId`   | Server id                                      |
| `discordChannelId` | Channel id                                     |
| `authorDiscordId`  | Author's user id                               |
| `occurredAt`       | When the message was created on Discord        |
| `communityId`      | The NEXUS community of that server             |
| `id`, `createdAt`  | Row id and when NEXUS stored it                |

On `communities`: `bot_connected_at` (start of collection for the current
installation) and `bot_last_seen_at` (last heartbeat).

## What is NOT collected

- Message **content**, embeds, attachments, components, stickers.
- Mentions, reactions, edits, deletions.
- Member lists, roles, presences, voice activity.
- **History before installation**: only messages created while the bot is
  running are seen. Messages sent while it is off are never recorded.
- Direct messages, bot authors, webhooks and system messages (ignored).
- Servers that are not allowlisted, or that have no NEXUS community.

Logs follow the same rule: counts, reasons and allowlisted server ids only.
Tokens, credentialed URLs and sensitive keys are scrubbed.

## Allowlist: which server ids

`DISCORD_GUILD_ALLOWLIST` is the list of servers the bot may process. It fails
closed: if it is empty, nothing is stored.

To get a server id (for the test server "CAPTURAS"): Discord **User Settings ->
Advanced -> Developer Mode** on, then right-click the server icon -> **Copy
Server ID**. The Overview also prints the id in the install steps. Put it in
`.env`:

```
DISCORD_GUILD_ALLOWLIST=123456789012345678
```

A server also needs a NEXUS community: sign in to the web app and select the
server first. The bot never creates communities.

## Invite with minimal permissions

On the Overview of a community whose bot is not installed, **Invite bot** opens:

```
https://discord.com/oauth2/authorize?client_id=<AUTH_DISCORD_ID>&scope=bot&permissions=1024&guild_id=<server id>&disable_guild_select=true
```

- `scope=bot` only (no `applications.commands`).
- `permissions=1024` is **View Channels** (bit `1 << 10`) and nothing else: no
  Send Messages, no Manage \*, no Administrator. The Gateway only delivers
  message events for channels the bot can see.
- The link pre-selects the server and locks the picker. It contains no secret.

Opening or approving the link does not mark anything as installed. Installation
is confirmed by the bot itself when it sees the server on the Gateway.

## Start and stop

```bash
npm run bot:dev     # tsx watch: restarts on source changes
npm run bot:start   # tsx, no watch
```

Stop with **Ctrl+C**. SIGINT and SIGTERM trigger one graceful shutdown: stop the
heartbeat, flush the buffered messages (5 s timeout), destroy the client,
disconnect the database. A second signal exits immediately. (`bot:dev` also
restarts the process when you edit bot code, so use `bot:start` when you want to
observe a clean Ctrl+C shutdown.)

## What to expect in the logs

JSON lines on stdout, one object per line (`level`, `event`, fields):

| Event                            | When                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `bot_starting`                   | Configuration is valid; lists the allowlisted server ids.                                 |
| `gateway_ready`                  | Logged in; `guilds` = servers the bot is in.                                              |
| `reconcile_done`                 | After `ready`: `present`, `newlyConnected`, `absent`, `cleared`, `ignoredGuilds`.         |
| `bot_connected`                  | Installation confirmed for a server (`firstConnection: true` the first time).             |
| `ingest_flush`                   | A batch was written: `stored`, `skipped` (duplicates) and `rejected` (counts per reason). |
| `bot_disconnected`               | The bot was removed from a server (`cleared: true`).                                      |
| `shutdown_started` / `_complete` | Graceful shutdown.                                                                        |

Heartbeats are logged at `debug` level, which is below the default `info`, so a
healthy heartbeat is silent. Failures show up as `heartbeat_failed` /
`heartbeat_skipped` warnings. The reliable way to see the heartbeat is the
Overview ("Last heartbeat").

## Heartbeat semantics

Every `BOT_HEARTBEAT_INTERVAL_MS` (default 60 s) the bot refreshes its community
cache, connects communities that appeared in NEXUS after startup and sets
`bot_last_seen_at = now` for the allowlisted communities it is present in. It
never writes "offline": the web app derives the status
(`src/lib/bot-status.ts`):

| Status          | Rule                                                                    |
| --------------- | ----------------------------------------------------------------------- |
| `not_installed` | `bot_connected_at` is null                                              |
| `online`        | Installed and the last heartbeat is at most **3 minutes** old           |
| `offline`       | Installed, but never beat or the last heartbeat is older than 3 minutes |

## Troubleshooting

- **`login_failed` with `reason: "token_invalid"` (TokenInvalid), exit code 1.**
  `DISCORD_BOT_TOKEN` is wrong or was reset. Copy a fresh token from the Bot
  page.
- **`config_invalid`, exit code 2.** The `problems` list names the variable (for
  example a malformed `DISCORD_GUILD_ALLOWLIST` entry by position). Values are
  never printed.
- **`processing_disabled`.** `DISCORD_GUILD_ALLOWLIST` is empty or missing. The
  bot logs in but stores nothing and writes no status.
- **`rejected: { guild_not_allowed: N }` in `ingest_flush`.** Messages arrived
  from a server that is not allowlisted. Add its id to the allowlist and restart.
- **`rejected: { no_community: N }`.** The server is allowlisted but has no NEXUS
  community. Sign in to NEXUS and select the server, then wait for the next
  heartbeat (or restart the bot).
- **`guild_without_community` at start.** Same cause as `no_community`.
- **The Overview stays "not installed".** The bot must be running, the server
  id must be in the allowlist and the community must exist. Check the logs for
  `bot_connected`.
- **No messages are counted.** The bot can only see channels where it has View
  Channels. Check channel permission overrides.
- **Everything works but the page looks stale.** The Overview refreshes itself
  every 30 s; reload to force it.

## Manual test plan (server CAPTURAS)

Prerequisites: PostgreSQL up, migrations applied, `npm run dev` running, you
signed in to NEXUS with Discord, and `DISCORD_BOT_TOKEN` in `.env`.

1. Copy the CAPTURAS server id (Developer Mode -> right-click -> Copy Server ID)
   and put it in `DISCORD_GUILD_ALLOWLIST` in `.env`.
2. In NEXUS go to `/onboarding` and select CAPTURAS. The Overview shows "Bot not
   installed" and the **Invite bot** button.
3. Click **Invite bot**, choose nothing (the server is pre-selected), check that
   the only permission listed is View Channels, and authorize. The Overview does
   not change yet: the link alone confirms nothing.
4. Run `npm run bot:start`. Expect `bot_starting`, `gateway_ready`,
   `reconcile_done` and `bot_connected` in the logs.
5. Within 30 s the Overview shows **Bot online**, "Installed (collecting since)"
   today and a recent "Last heartbeat". Metrics show 0 and "No messages recorded
   yet".
6. Send a message in a channel the bot can see. Within one batch (about 2 s) the
   log shows `ingest_flush` with `stored: 1`. The Overview (auto refresh, at most
   30 s) shows 1 recorded message, 1 in the last 24 h and 7 days, 1 active author
   and a row in Recent activity with your channel id and user id (no text).
7. Messages cannot be duplicated from Discord. Idempotency is covered by the
   automated tests; if the bot restarts and Discord re-delivers an event, it
   counts as `skipped`.
8. Stop the bot with Ctrl+C. The log shows `shutdown_started` and
   `shutdown_complete`. After 3 minutes without a heartbeat (or after the next
   refresh past that point) the Overview shows **Bot installed · offline** and
   keeps the numbers.
9. Start the bot again: it returns to **online**.
10. In Discord, kick the bot from CAPTURAS (Server Settings -> Members -> kick).
    The log shows `bot_disconnected` with `cleared: true` and the Overview goes
    back to **Bot not installed** with the install panel. Stored events remain in
    the database.
