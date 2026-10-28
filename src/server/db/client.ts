import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "./prisma";

/**
 * Web entry point for the database client. Behaviour is unchanged: a lazy
 * Prisma singleton (see `./prisma`), guarded by `server-only` so it can never
 * be bundled into client code.
 */
export function getDb(): PrismaClient {
  return getPrismaClient();
}
