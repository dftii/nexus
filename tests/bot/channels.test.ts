import { ChannelType, GatewayIntentBits } from "discord.js";
import { describe, expect, it, vi } from "vitest";
import { BOT_INTENTS } from "@/bot/client";
import { toChannelInfo } from "@/bot/handlers/channels";
import { createAllowlist } from "@/bot/services/allowlist";
import {
  createChannelSync,
  type ChannelInfo,
  type ChannelRepository,
} from "@/bot/services/channel-sync";
import { createCommunityCache } from "@/bot/services/community-cache";
import { silentLogger } from "@/bot/services/logger";
import { createFakeBotRepository } from "../helpers/fake-bot-repo";

const GUILD = "123456789012345678";
const AT = new Date("2026-10-29T10:00:00.000Z");

describe("toChannelInfo", () => {
  const base = { id: "1", guildId: GUILD, name: "general" };

  it("maps message-bearing channel types", () => {
    for (const type of [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.GuildVoice,
      ChannelType.GuildStageVoice,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.AnnouncementThread,
    ]) {
      expect(toChannelInfo({ ...base, type })).toEqual({
        id: "1",
        guildId: GUILD,
        name: "general",
        type,
      });
    }
  });

  it("ignores categories, forums, DMs and nameless or guildless input", () => {
    expect(
      toChannelInfo({ ...base, type: ChannelType.GuildCategory }),
    ).toBeNull();
    expect(toChannelInfo({ ...base, type: ChannelType.GuildForum })).toBeNull();
    expect(
      toChannelInfo({ ...base, type: ChannelType.DM, guildId: null }),
    ).toBeNull();
    expect(toChannelInfo({ ...base, type: 0, name: null })).toBeNull();
    expect(toChannelInfo({ ...base, type: 0, guildId: undefined })).toBeNull();
  });

  it("copies only the label fields", () => {
    const info = toChannelInfo({
      ...base,
      type: 0,
      topic: "secret",
      permissionOverwrites: [],
    } as never);
    expect(Object.keys(info!).sort()).toEqual([
      "guildId",
      "id",
      "name",
      "type",
    ]);
  });
});

describe("intents", () => {
  it("stay exactly Guilds + GuildMessages", () => {
    expect([...BOT_INTENTS].sort()).toEqual(
      [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages].sort(),
    );
  });
});

describe("createChannelSync", () => {
  async function setup(allow = [GUILD]) {
    const fake = createFakeBotRepository([
      { id: "com_1", discordGuildId: GUILD, botConnectedAt: null },
    ]);
    const allowlist = createAllowlist(allow);
    const cache = createCommunityCache({
      repository: fake.repo,
      allowlist,
      logger: silentLogger,
    });
    const repository = {
      upsertChannels: vi.fn<ChannelRepository["upsertChannels"]>(
        async () => undefined,
      ),
      markChannelDeleted: vi.fn<ChannelRepository["markChannelDeleted"]>(
        async () => undefined,
      ),
    };
    const info: ChannelInfo = { id: "7", guildId: GUILD, name: "a", type: 0 };
    const sync = createChannelSync({
      repository,
      cache,
      allowlist,
      directory: { channels: () => [info] },
      logger: silentLogger,
      now: () => AT,
    });
    return { repository, sync, info };
  }

  it("syncs a guild's channels for its community (cache miss refreshes)", async () => {
    const { repository, sync, info } = await setup();
    await sync.syncGuild(GUILD);
    expect(repository.upsertChannels).toHaveBeenCalledWith(
      "com_1",
      GUILD,
      [info],
      AT,
    );
  });

  it("ignores guilds that are not allowlisted", async () => {
    const { repository, sync, info } = await setup(["999999999999999999"]);
    await sync.syncGuild(GUILD);
    await sync.upsert(info);
    await sync.remove({ id: "7", guildId: GUILD });
    expect(repository.upsertChannels).not.toHaveBeenCalled();
    expect(repository.markChannelDeleted).not.toHaveBeenCalled();
  });

  it("marks deletions and never throws when the database fails", async () => {
    const { repository, sync, info } = await setup();
    await sync.remove({ id: "7", guildId: GUILD });
    expect(repository.markChannelDeleted).toHaveBeenCalledWith("7", AT);
    repository.upsertChannels.mockRejectedValueOnce(new Error("db"));
    await expect(sync.upsert(info)).resolves.toBeUndefined();
  });
});
