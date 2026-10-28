import { beforeEach, describe, expect, it, vi } from "vitest";

const { pingDatabase } = vi.hoisted(() => ({ pingDatabase: vi.fn() }));
vi.mock("@/server/db", () => ({ pingDatabase }));

import { GET, dynamic } from "@/app/api/ready/route";

describe("GET /api/ready", () => {
  beforeEach(() => {
    pingDatabase.mockReset();
  });

  it("returns 200 when the database is reachable", async () => {
    pingDatabase.mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ready");
    expect(body.checks).toEqual({ database: "ok" });
  });

  it("returns 503 with a generic body when the database is down", async () => {
    pingDatabase.mockResolvedValue(false);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("is forced dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
