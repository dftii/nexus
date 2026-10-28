import { describe, expect, it } from "vitest";
import {
  BotConfigError,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  parseBotConfig,
} from "@/bot/config";
import { createAllowlist } from "@/bot/services/allowlist";
import { createCommunityCache } from "@/bot/services/community-cache";
import { createIngestion } from "@/bot/services/ingestion";
import { silentLogger } from "@/bot/services/logger";
import {
  classifyMessage,
  extractMessageDto,
  type MessageSource,
} from "@/bot/services/message-events";
import { createFakeBotRepository } from "../helpers/fake-bot-repo";

const GUILD = "123456789012345678";
const base = {
  DISCORD_BOT_TOKEN: "x.y.z",
  DATABASE_URL: "postgresql://u:p@h/d",
};

describe("MESSAGE_EVENT_RETENTION_DAYS", () => {
  const days = (v?: string) =>
    parseBotConfig({ ...base, MESSAGE_EVENT_RETENTION_DAYS: v }).retentionDays;

  it("defaults to 30 when missing or blank", () => {
    expect(days(undefined)).toBe(30);
    expect(days("  ")).toBe(30);
  });

  it("accepts the bounds and values in between", () => {
    expect(days(String(MIN_RETENTION_DAYS))).toBe(30);
    expect(days("90")).toBe(90);
    expect(days(String(MAX_RETENTION_DAYS))).toBe(365);
  });

  it("rejects out-of-range and malformed values without echoing them", () => {
    for (const bad of ["29", "366", "0", "-30", "abc", "30.5", "1e2"]) {
      let message = "";
      try {
        days(bad);
      } catch (error) {
        expect(error).toBeInstanceOf(BotConfigError);
        message = (error as Error).message;
      }
      // Exact text: names the variable and the bounds, never the bad value.
      expect(message).toBe(
        "Invalid bot configuration - MESSAGE_EVENT_RETENTION_DAYS must be an integer between 30 and 365",
      );
    }
  });
});

function message(overrides: Partial<MessageSource> = {}): MessageSource {
  return {
    id: "800000000000000001",
    guildId: GUILD,
    channelId: "700000000000000001",
    createdTimestamp: Date.parse("2026-10-29T10:00:00.000Z"),
    webhookId: null,
    system: false,
    author: { id: "600000000000000001", bot: false },
    ...overrides,
  };
}

async function setup() {
  const fake = createFakeBotRepository([
    { id: "com_1", discordGuildId: GUILD, botConnectedAt: null },
  ]);
  const allowlist = createAllowlist([GUILD]);
  const cache = createCommunityCache({
    repository: fake.repo,
    allowlist,
    logger: silentLogger,
  });
  await cache.refresh();
  return { fake, allowlist, cache };
}

describe("too_old classification", () => {
  // Now = 2026-11-30 12:00Z, retention 30 days -> cutoff 2026-10-31 00:00Z.
  const oldestAccepted = () => new Date("2026-10-31T00:00:00.000Z");

  it("rejects events before the cutoff and accepts the cutoff itself", async () => {
    const deps = { ...(await setup()), oldestAccepted };
    const at = (iso: string) =>
      classifyMessage(
        extractMessageDto(message({ createdTimestamp: Date.parse(iso) })),
        deps,
      );
    expect(at("2026-10-30T23:59:59.999Z")).toEqual({
      accepted: false,
      reason: "too_old",
    });
    expect(at("2026-10-31T00:00:00.000Z").accepted).toBe(true);
    expect(at("2026-11-30T11:59:00.000Z").accepted).toBe(true);
  });

  it("does not apply without a cutoff", async () => {
    const deps = await setup();
    const result = classifyMessage(
      extractMessageDto(message({ createdTimestamp: 1 })),
      deps,
    );
    expect(result.accepted).toBe(true);
  });

  it("createIngestion derives the cutoff from retentionDays and the clock", async () => {
    const { fake, allowlist, cache } = await setup();
    const ingestion = createIngestion({
      repository: fake.repo,
      allowlist,
      cache,
      logger: silentLogger,
      retentionDays: 30,
      now: () => new Date("2026-11-30T12:00:00.000Z"),
    });
    ingestion.handle(
      message({ createdTimestamp: Date.parse("2026-10-30T23:59:59.999Z") }),
    );
    ingestion.handle(
      message({
        id: "800000000000000002",
        createdTimestamp: Date.parse("2026-10-31T00:00:00.000Z"),
      }),
    );
    expect(ingestion.writer.size).toBe(1);
    await ingestion.stop(1000);
    expect(fake.events.size).toBe(1);
  });
});
