import { describe, expect, it } from "vitest";
import { BOT_HEARTBEAT_STALE_AFTER_MS, getBotStatus } from "@/lib/bot-status";

const now = new Date("2026-10-29T12:00:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const botConnectedAt = ago(86_400_000);

describe("getBotStatus", () => {
  it("is not_installed without botConnectedAt, whatever the heartbeat", () => {
    expect(
      getBotStatus({ botConnectedAt: null, botLastSeenAt: null }, now),
    ).toBe("not_installed");
    expect(
      getBotStatus({ botConnectedAt: null, botLastSeenAt: ago(1000) }, now),
    ).toBe("not_installed");
  });

  it("is offline when installed but never seen", () => {
    expect(getBotStatus({ botConnectedAt, botLastSeenAt: null }, now)).toBe(
      "offline",
    );
  });

  it("is online for a fresh heartbeat", () => {
    expect(
      getBotStatus({ botConnectedAt, botLastSeenAt: ago(5_000) }, now),
    ).toBe("online");
  });

  it("the stale threshold is 3 minutes", () => {
    expect(BOT_HEARTBEAT_STALE_AFTER_MS).toBe(180_000);
  });

  it("is online exactly at the threshold and offline one ms after", () => {
    expect(
      getBotStatus(
        { botConnectedAt, botLastSeenAt: ago(BOT_HEARTBEAT_STALE_AFTER_MS) },
        now,
      ),
    ).toBe("online");
    expect(
      getBotStatus(
        {
          botConnectedAt,
          botLastSeenAt: ago(BOT_HEARTBEAT_STALE_AFTER_MS + 1),
        },
        now,
      ),
    ).toBe("offline");
  });

  it("treats a heartbeat from the future (clock skew) as fresh", () => {
    expect(
      getBotStatus(
        { botConnectedAt, botLastSeenAt: new Date(now.getTime() + 10_000) },
        now,
      ),
    ).toBe("online");
  });

  it("defaults now to the current time", () => {
    expect(getBotStatus({ botConnectedAt, botLastSeenAt: new Date() })).toBe(
      "online",
    );
  });
});
