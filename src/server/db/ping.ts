import "server-only";

import { getDb } from "./client";

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Readiness check: run `SELECT 1`. Resolves `true` when the database answers
 * and `false` on ANY failure (bad config, connection error, timeout). Errors
 * are swallowed on purpose so callers cannot leak connection details.
 */
export async function pingDatabase(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    await Promise.race([getDb().$queryRaw`SELECT 1`, timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
