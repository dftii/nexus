import { describe, expect, it, vi } from "vitest";
import { createAllowlist } from "@/bot/services/allowlist";
import { createCommunityCache } from "@/bot/services/community-cache";
import { createIngestion } from "@/bot/services/ingestion";
import {
  classifyMessage,
  createRejectionCounter,
  extractMessageDto,
  type MessageSource,
} from "@/bot/services/message-events";
import { silentLogger } from "@/bot/services/logger";
import { createFakeBotRepository } from "../helpers/fake-bot-repo";

const GUILD = "123456789012345678";
const OTHER_GUILD = "999999999999999999";

const ALLOWED_SOURCE_KEYS = new Set([
  "id",
  "guildId",
  "channelId",
  "createdTimestamp",
  "webhookId",
  "system",
  "author",
]);

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

describe("extractMessageDto", () => {
  it("reads only the allowed fields, even from a content-bearing object", () => {
    // A Proxy that throws on any property outside the allowed set proves the
    // extractor never even looks at content, embeds, attachments, ...
    const raw = {
      ...message(),
      content: "super secret text",
      embeds: [{ title: "x" }],
      attachments: new Map([["1", { url: "https://x" }]]),
      components: [],
      mentions: { users: [] },
      stickers: [],
      cleanContent: "secret",
    };
    const guarded = new Proxy(raw, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && !ALLOWED_SOURCE_KEYS.has(prop)) {
          throw new Error(`forbidden read of ${prop}`);
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const dto = extractMessageDto(guarded as MessageSource);
    expect(Object.keys(dto).sort()).toEqual(
      [
        "authorId",
        "authorIsBot",
        "channelId",
        "createdTimestamp",
        "guildId",
        "id",
        "isSystem",
        "isWebhook",
      ].sort(),
    );
    expect(JSON.stringify(dto)).not.toContain("secret");
  });

  it("flags webhook messages and tolerates a missing author", () => {
    expect(extractMessageDto(message({ webhookId: "5" })).isWebhook).toBe(true);
    const dto = extractMessageDto(message({ author: null }));
    expect(dto.authorId).toBeNull();
  });
});

describe("classifyMessage", () => {
  it("accepts a normal guild message and persists exactly the allowed keys", async () => {
    const { allowlist, cache } = await setup();
    const result = classifyMessage(
      extractMessageDto({
        ...message(),
        content: "hello",
        embeds: [1],
      } as MessageSource),
      { allowlist, cache },
    );
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(Object.keys(result.record).sort()).toEqual(
      [
        "authorDiscordId",
        "communityId",
        "discordChannelId",
        "discordGuildId",
        "discordMessageId",
        "occurredAt",
      ].sort(),
    );
    expect(result.record).toEqual({
      communityId: "com_1",
      discordMessageId: "800000000000000001",
      discordGuildId: GUILD,
      discordChannelId: "700000000000000001",
      authorDiscordId: "600000000000000001",
      occurredAt: new Date("2026-10-29T10:00:00.000Z"),
    });
  });

  it.each([
    ["dm", { guildId: null }],
    ["system", { system: true }],
    ["webhook", { webhookId: "123" }],
    ["bot_author", { author: { id: "1", bot: true } }],
    ["no_author", { author: null }],
    ["guild_not_allowed", { guildId: OTHER_GUILD }],
    ["invalid", { createdTimestamp: Number.NaN }],
  ] as const)("rejects %s", async (reason, overrides) => {
    const { allowlist, cache } = await setup();
    const result = classifyMessage(extractMessageDto(message(overrides)), {
      allowlist,
      cache,
    });
    expect(result).toEqual({ accepted: false, reason });
  });

  it("rejects an allowlisted guild without a NEXUS community", async () => {
    const other = "888888888888888888";
    const fake = createFakeBotRepository([]);
    const allowlist = createAllowlist([other]);
    const cache = createCommunityCache({
      repository: fake.repo,
      allowlist,
      logger: silentLogger,
    });
    await cache.refresh();
    const result = classifyMessage(
      extractMessageDto(message({ guildId: other })),
      { allowlist, cache },
    );
    expect(result).toEqual({ accepted: false, reason: "no_community" });
  });

  it("fails closed with an empty allowlist", async () => {
    const { cache } = await setup();
    const result = classifyMessage(extractMessageDto(message()), {
      allowlist: createAllowlist([]),
      cache,
    });
    expect(result).toEqual({ accepted: false, reason: "guild_not_allowed" });
  });
});

describe("rejection counter", () => {
  it("aggregates and resets", () => {
    const counter = createRejectionCounter();
    expect(counter.drain()).toBeNull();
    counter.add("dm");
    counter.add("dm");
    counter.add("webhook");
    expect(counter.drain()).toEqual({ dm: 2, webhook: 1 });
    expect(counter.drain()).toBeNull();
  });
});

describe("createIngestion", () => {
  it("stores accepted messages, counts rejected ones and logs one aggregate", async () => {
    vi.useFakeTimers();
    try {
      const { fake, allowlist, cache } = await setup();
      const info = vi.fn();
      const ingestion = createIngestion({
        repository: fake.repo,
        allowlist,
        cache,
        logger: { ...silentLogger, info },
      });
      ingestion.start();
      ingestion.handle(message({ id: "800000000000000001" }));
      ingestion.handle(message({ id: "800000000000000002" }));
      ingestion.handle(message({ id: "800000000000000003", guildId: null }));
      ingestion.handle(
        message({ id: "800000000000000004", author: { id: "9", bot: true } }),
      );
      await vi.advanceTimersByTimeAsync(2_000);
      expect([...fake.events.keys()].sort()).toEqual([
        "800000000000000001",
        "800000000000000002",
      ]);
      expect(info).toHaveBeenCalledWith("ingest_flush", {
        stored: 2,
        skipped: 0,
        rejected: { dm: 1, bot_author: 1 },
      });
      await ingestion.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("never throws on a malformed message", async () => {
    const { fake, allowlist, cache } = await setup();
    const info = vi.fn();
    const ingestion = createIngestion({
      repository: fake.repo,
      allowlist,
      cache,
      logger: { ...silentLogger, info },
    });
    expect(() =>
      ingestion.handle(null as unknown as MessageSource),
    ).not.toThrow();
    ingestion.reportRejections();
    expect(info).toHaveBeenCalledWith("ingest_rejections", {
      rejected: { invalid: 1 },
    });
  });
});
