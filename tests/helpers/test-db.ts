import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Disposable PostgreSQL for integration tests (`*.int.test.ts`).
 *
 * The URL is `TEST_DATABASE_URL`, or `DATABASE_URL` with the database name
 * swapped for `nexus_test` (never the dev database itself). With neither set
 * (plain `npm test`, CI without Postgres) the suites are skipped. Run them
 * with `npm run test:db`; the `nexus_test` database must exist and be
 * migrated (`docs/PROGRESS.md`, Phase 4).
 */
export function testDatabaseUrl(): string | null {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return null;
  const url = new URL(base);
  url.pathname = "/nexus_test";
  return url.toString();
}

export const hasTestDatabase = testDatabaseUrl() !== null;

export function createTestPrisma(): PrismaClient {
  const connectionString = testDatabaseUrl();
  if (!connectionString) throw new Error("No test database configured");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Empty every table (FK-safe order via CASCADE). */
export async function resetTestDatabase(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe(
    `TRUNCATE "message_events", "community_daily_activity", "channel_daily_activity", "discord_channels", "community_memberships", "sessions", "accounts", "communities", "users" CASCADE`,
  );
}
