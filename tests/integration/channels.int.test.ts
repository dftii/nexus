import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaChannelRepository } from "@/bot/services/channel-sync";
import {
  createTestPrisma,
  hasTestDatabase,
  resetTestDatabase,
} from "../helpers/test-db";
import { createCommunity } from "./aggregation-helpers";

const T1 = new Date("2026-10-29T10:00:00.000Z");
const T2 = new Date("2026-10-29T11:00:00.000Z");

describe.skipIf(!hasTestDatabase)("channel metadata (PostgreSQL)", () => {
  let db: PrismaClient;

  beforeEach(async () => {
    db ??= createTestPrisma();
    await resetTestDatabase(db);
  });
  afterAll(async () => {
    await db?.$disconnect();
  });

  it("upserts a guild's channels, renames them and revives deleted ones", async () => {
    const c = await createCommunity(db);
    const repo = createPrismaChannelRepository(db);
    const guildId = c.discordGuildId;

    await repo.upsertChannels(
      c.id,
      guildId,
      [
        { id: "c1", guildId, name: "general", type: 0 },
        { id: "t1", guildId, name: "a thread", type: 11 },
      ],
      T1,
    );
    expect(
      await db.discordChannel.count({ where: { communityId: c.id } }),
    ).toBe(2);

    await repo.markChannelDeleted("c1", T1);
    const deleted = await db.discordChannel.findUniqueOrThrow({
      where: { discordChannelId: "c1" },
    });
    expect(deleted.deletedAt).toEqual(T1);
    expect(deleted.name).toBe("general"); // label kept for old analytics

    await repo.upsertChannels(
      c.id,
      guildId,
      [{ id: "c1", guildId, name: "renamed", type: 0 }],
      T2,
    );
    const revived = await db.discordChannel.findUniqueOrThrow({
      where: { discordChannelId: "c1" },
    });
    expect(revived).toMatchObject({
      name: "renamed",
      deletedAt: null,
      communityId: c.id,
    });
    expect(await db.discordChannel.count()).toBe(2);
  });

  it("ignores deleting an unknown channel", async () => {
    await createPrismaChannelRepository(db).markChannelDeleted("nope", T1);
    expect(await db.discordChannel.count()).toBe(0);
  });
});
