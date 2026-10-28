import { ChannelType, Events, type Client } from "discord.js";
import type {
  ChannelDirectory,
  ChannelInfo,
  ChannelSync,
} from "../services/channel-sync";

/**
 * Channel types that can carry messages: text, announcement, voice and stage
 * (their built-in chat) and threads. Categories and forums hold no messages.
 */
const MESSAGE_CHANNEL_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
]);

/** The only channel fields read; a discord.js channel satisfies it structurally. */
export interface ChannelSource {
  readonly id: string;
  readonly type: number;
  readonly name?: string | null;
  readonly guildId?: string | null;
}

/** Map a Gateway channel to a label row, or null if it is not message-bearing. */
export function toChannelInfo(channel: ChannelSource): ChannelInfo | null {
  if (!channel.guildId || !channel.name) return null;
  if (!MESSAGE_CHANNEL_TYPES.has(channel.type)) return null;
  return {
    id: channel.id,
    guildId: channel.guildId,
    name: channel.name,
    type: channel.type,
  };
}

/** Adapter: expose the discord.js guild cache as a plain `ChannelDirectory`. */
export function createChannelDirectory(client: Client): ChannelDirectory {
  return {
    channels(guildId) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return [];
      const out: ChannelInfo[] = [];
      for (const channel of guild.channels.cache.values()) {
        const info = toChannelInfo(channel);
        if (info) out.push(info);
      }
      return out;
    },
  };
}

/** Channel and thread lifecycle events -> `ChannelSync`. Metadata only. */
export function registerChannelHandlers(
  client: Client,
  sync: ChannelSync,
): void {
  const upsert = (channel: ChannelSource) => {
    const info = toChannelInfo(channel);
    if (info) void sync.upsert(info);
  };
  const remove = (channel: ChannelSource) => {
    if (channel.guildId) {
      void sync.remove({ id: channel.id, guildId: channel.guildId });
    }
  };

  // A guild that just became available: its channels are in the cache.
  client.on(Events.GuildCreate, (guild) => void sync.syncGuild(guild.id));
  client.on(Events.ChannelCreate, upsert);
  client.on(Events.ChannelUpdate, (_old, channel) => upsert(channel));
  client.on(Events.ChannelDelete, remove);
  client.on(Events.ThreadCreate, upsert);
  client.on(Events.ThreadUpdate, (_old, thread) => upsert(thread));
  client.on(Events.ThreadDelete, remove);
}
