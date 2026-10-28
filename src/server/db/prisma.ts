import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

/**
 * Framework-agnostic Prisma core, shared by the web app and the bot process.
 *
 * It deliberately does NOT import `server-only` (that package throws when it is
 * loaded in plain Node, which is how the bot runs). The web entry point
 * (`./client`, `./index`) keeps the `server-only` guard and builds on this.
 * The bot imports this module directly and never `@/server/db`.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Build a new client from the validated `DATABASE_URL`. No caching. */
export function createPrismaClient(): PrismaClient {
  const { DATABASE_URL } = getEnv();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  });
}

/**
 * Lazy Prisma singleton. The client is created on first use (so importing this
 * module never requires DATABASE_URL) and cached on `globalThis` outside
 * production so Next.js hot reloads do not open a new pool each time.
 */
export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
