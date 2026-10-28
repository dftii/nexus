/**
 * Run by tests/bot/repository-logger-client.test.ts in a plain Node process
 * (via tsx). Imports the bot modules WITHOUT the vitest `server-only` stub and
 * without logging in to Discord. If anything under the bot reaches a module
 * that imports `server-only`, the import throws and this script fails.
 */
async function run() {
  const modules = [
    "@/bot/config",
    "@/bot/client",
    "@/bot/handlers/guilds",
    "@/bot/handlers/messages",
    "@/bot/handlers/lifecycle",
    "@/bot/services/allowlist",
    "@/bot/services/batch-writer",
    "@/bot/services/community-cache",
    "@/bot/services/heartbeat",
    "@/bot/services/ingestion",
    "@/bot/services/installation",
    "@/bot/services/logger",
    "@/bot/services/message-events",
    "@/bot/services/repository",
    "@/server/db/prisma",
    "@/lib/bot-status",
  ];
  for (const name of modules) await import(name);
  console.log(`bot graph ok (${modules.length} modules)`);

  // Control: the web entry point must throw here, proving the check is real.
  try {
    await import("@/server/db");
    console.log("control did NOT throw");
    process.exitCode = 1;
  } catch {
    console.log("control throws as expected");
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
