import { execFileSync } from "node:child_process";
import path from "node:path";
import { GatewayIntentBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { BOT_INTENTS, createBotClient } from "@/bot/client";
import {
  createLogger,
  describeError,
  redactString,
} from "@/bot/services/logger";
import { createPrismaBotRepository } from "@/bot/services/repository";

const T = new Date("2026-10-29T10:00:00.000Z");

function fakePrisma() {
  return {
    community: {
      findMany: vi.fn(async () => [
        { id: "c1", discordGuildId: "g1", botConnectedAt: null },
      ]),
      updateMany: vi.fn(async () => ({ count: 2 })),
    },
    messageEvent: {
      createMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(
        async () => ({ count: 3 }),
      ),
    },
  };
}

describe("createPrismaBotRepository", () => {
  it("looks communities up by guild id with a minimal select", async () => {
    const db = fakePrisma();
    const repo = createPrismaBotRepository(db as never);
    await expect(repo.findCommunitiesByGuildIds(["g1"])).resolves.toHaveLength(
      1,
    );
    expect(db.community.findMany).toHaveBeenCalledWith({
      where: { discordGuildId: { in: ["g1"] } },
      select: { id: true, discordGuildId: true, botConnectedAt: true },
    });
  });

  it("inserts with createMany + skipDuplicates and only the allowed columns", async () => {
    const db = fakePrisma();
    const repo = createPrismaBotRepository(db as never);
    const sneaky = {
      communityId: "c1",
      discordMessageId: "m1",
      discordGuildId: "g1",
      discordChannelId: "ch1",
      authorDiscordId: "u1",
      occurredAt: T,
      content: "must never be persisted",
    };
    await expect(repo.insertMessageEvents([sneaky])).resolves.toBe(3);
    const arg = db.messageEvent.createMany.mock.calls[0]![0] as unknown as {
      data: Array<Record<string, unknown>>;
      skipDuplicates: boolean;
    };
    expect(arg.skipDuplicates).toBe(true);
    expect(Object.keys(arg.data[0]!).sort()).toEqual(
      [
        "authorDiscordId",
        "communityId",
        "discordChannelId",
        "discordGuildId",
        "discordMessageId",
        "occurredAt",
      ].sort(),
    );
  });

  it("markConnected only updates rows where botConnectedAt is null", async () => {
    const db = fakePrisma();
    const repo = createPrismaBotRepository(db as never);
    await repo.markConnected(["c1"], T);
    expect(db.community.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1"] }, botConnectedAt: null },
      data: { botConnectedAt: T },
    });
  });

  it("markDisconnected clears botConnectedAt and never touches events", async () => {
    const db = fakePrisma();
    const repo = createPrismaBotRepository(db as never);
    await repo.markDisconnected(["c1"]);
    expect(db.community.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1"] }, botConnectedAt: { not: null } },
      data: { botConnectedAt: null },
    });
  });

  it("touch is a single updateMany on botLastSeenAt", async () => {
    const db = fakePrisma();
    const repo = createPrismaBotRepository(db as never);
    await repo.touch(["c1", "c2"], T);
    expect(db.community.updateMany).toHaveBeenCalledTimes(1);
    expect(db.community.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] } },
      data: { botLastSeenAt: T },
    });
  });

  it("makes no query for empty id lists", async () => {
    const db = fakePrisma();
    const repo = createPrismaBotRepository(db as never);
    await repo.findCommunitiesByGuildIds([]);
    await repo.insertMessageEvents([]);
    await repo.markConnected([], T);
    await repo.markDisconnected([]);
    await repo.touch([], T);
    expect(db.community.findMany).not.toHaveBeenCalled();
    expect(db.community.updateMany).not.toHaveBeenCalled();
    expect(db.messageEvent.createMany).not.toHaveBeenCalled();
  });
});

describe("logger", () => {
  it("writes one JSON object per line with level and event", () => {
    const lines: string[] = [];
    const log = createLogger({
      write: (line) => lines.push(line),
      now: () => T,
    });
    log.info("hello", { stored: 2 });
    expect(JSON.parse(lines[0]!)).toEqual({
      time: T.toISOString(),
      level: "info",
      event: "hello",
      stored: 2,
    });
  });

  it("respects the minimum level", () => {
    const lines: string[] = [];
    const log = createLogger({ write: (l) => lines.push(l) });
    log.debug("quiet");
    log.warn("loud");
    expect(lines).toHaveLength(1);
  });

  it("redacts sensitive keys, tokens and credentialed URLs", () => {
    const lines: string[] = [];
    const log = createLogger({ write: (l) => lines.push(l) });
    const fakeToken = `${"A".repeat(24)}.${"b".repeat(6)}.${"C".repeat(27)}`;
    log.error("x", {
      token: "abc",
      content: "private words",
      nested: { password: "p", ok: 1 },
      message: `failed with ${fakeToken} at postgresql://user:hunter2@host:5432/db`,
    });
    const out = lines[0]!;
    expect(out).not.toContain(fakeToken);
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("private words");
    expect(JSON.parse(out).token).toBe("[redacted]");
    expect(JSON.parse(out).nested).toEqual({ password: "[redacted]", ok: 1 });
  });

  it("describeError returns name, code and a redacted message, no stack", () => {
    const err = Object.assign(new Error("boom postgres://u:pw@h/db"), {
      code: "E_X",
    });
    const info = describeError(err);
    expect(info).toEqual({
      name: "Error",
      code: "E_X",
      message: "boom [redacted]@h/db",
    });
    expect(describeError("str")).toEqual({ name: "NonError", message: "str" });
  });

  it("truncates very long strings", () => {
    expect(redactString("x".repeat(1000)).length).toBeLessThan(400);
  });
});

describe("bot client", () => {
  it("requests exactly Guilds + GuildMessages and no privileged intent", () => {
    expect([...BOT_INTENTS].sort()).toEqual(
      [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages].sort(),
    );
    const client = createBotClient();
    expect(client.options.intents.bitfield).toBe(
      GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages,
    );
    void client.destroy();
  });
});

describe("bot module graph in plain Node", () => {
  it("loads without `server-only` throwing (real Node + tsx, no login)", () => {
    // Vitest aliases `server-only` to a stub, which would hide a violation.
    // Run the import graph in a real Node process where the package throws.
    const root = path.resolve(import.meta.dirname, "../..");
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", "tests/bot/fixtures/import-graph.ts"],
      { cwd: root, encoding: "utf8", timeout: 60_000 },
    );
    expect(output).toContain("bot graph ok");
    expect(output).toContain("control throws");
  }, 70_000);
});
