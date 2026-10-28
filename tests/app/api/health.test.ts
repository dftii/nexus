import { describe, expect, it } from "vitest";
import { GET, dynamic } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with status ok and does not need a database", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("nexus");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("is forced dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
