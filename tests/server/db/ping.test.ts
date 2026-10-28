import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, getDb } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  getDb: vi.fn(),
}));
vi.mock("@/server/db/client", () => ({ getDb }));

import { pingDatabase } from "@/server/db/ping";

describe("pingDatabase", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    getDb.mockReset();
    getDb.mockReturnValue({ $queryRaw: queryRaw });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is true when SELECT 1 succeeds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    await expect(pingDatabase()).resolves.toBe(true);
  });

  it("is false when the query fails", async () => {
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED"));
    await expect(pingDatabase()).resolves.toBe(false);
  });

  it("is false when the client cannot be created (invalid env)", async () => {
    getDb.mockImplementation(() => {
      throw new Error("Invalid environment variables - DATABASE_URL");
    });
    await expect(pingDatabase()).resolves.toBe(false);
  });

  it("is false when the query hangs past the timeout", async () => {
    vi.useFakeTimers();
    queryRaw.mockReturnValue(new Promise(() => {}));
    const result = pingDatabase(50);
    await vi.advanceTimersByTimeAsync(60);
    await expect(result).resolves.toBe(false);
  });
});
