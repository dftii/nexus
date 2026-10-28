import type { Allowlist } from "./allowlist";
import type { CommunityCache } from "./community-cache";
import type { MessageEventRecord } from "./repository";

/**
 * Message ingestion rules.
 *
 * DATA MINIMIZATION: `extractMessageDto` is the ONLY place that reads a
 * message. It reads exactly the fields of `MessageSource` below and nothing
 * else. `content`, `embeds`, `attachments`, `components`, `mentions` and
 * `stickers` are never touched, so they can neither be stored nor logged.
 */

/**
 * The only message fields the bot reads. A discord.js `Message` satisfies this
 * structurally.
 * - `webhookId`: non-null for webhook posts (skipped).
 * - `system`: true for system messages such as joins and pins (skipped).
 */
export interface MessageSource {
  readonly id: string;
  readonly guildId: string | null;
  readonly channelId: string;
  readonly createdTimestamp: number;
  readonly webhookId: string | null;
  readonly system: boolean;
  readonly author: { readonly id: string; readonly bot: boolean } | null;
}

/** Plain, detached copy of the allowed fields. */
export interface MessageDto {
  id: string;
  guildId: string | null;
  channelId: string;
  authorId: string | null;
  authorIsBot: boolean;
  createdTimestamp: number;
  isWebhook: boolean;
  isSystem: boolean;
}

export function extractMessageDto(message: MessageSource): MessageDto {
  const author = message.author;
  return {
    id: message.id,
    guildId: message.guildId,
    channelId: message.channelId,
    authorId: author ? author.id : null,
    authorIsBot: author ? author.bot : false,
    createdTimestamp: message.createdTimestamp,
    isWebhook: message.webhookId != null,
    isSystem: message.system === true,
  };
}

export type RejectionReason =
  | "dm"
  | "system"
  | "webhook"
  | "bot_author"
  | "no_author"
  | "invalid"
  | "guild_not_allowed"
  | "no_community";

export type Classification =
  | { accepted: true; record: MessageEventRecord }
  | { accepted: false; reason: RejectionReason };

/** Decide whether a message is stored and build the record to persist. */
export function classifyMessage(
  dto: MessageDto,
  deps: { allowlist: Allowlist; cache: CommunityCache },
): Classification {
  const reject = (reason: RejectionReason): Classification => ({
    accepted: false,
    reason,
  });

  if (!dto.guildId) return reject("dm");
  if (dto.isSystem) return reject("system");
  if (dto.isWebhook) return reject("webhook");
  if (!dto.authorId) return reject("no_author");
  if (dto.authorIsBot) return reject("bot_author");
  if (!deps.allowlist.has(dto.guildId)) return reject("guild_not_allowed");
  const community = deps.cache.get(dto.guildId);
  if (!community) return reject("no_community");

  const occurredAt = new Date(dto.createdTimestamp);
  if (!dto.id || !dto.channelId || Number.isNaN(occurredAt.getTime())) {
    return reject("invalid");
  }

  // Built field by field on purpose: never spread the DTO or the message.
  return {
    accepted: true,
    record: {
      communityId: community.communityId,
      discordMessageId: dto.id,
      discordGuildId: dto.guildId,
      discordChannelId: dto.channelId,
      authorDiscordId: dto.authorId,
      occurredAt,
    },
  };
}

export type RejectionCounts = Partial<Record<RejectionReason, number>>;

/** Aggregated counters for rejected messages (never per-message logs). */
export function createRejectionCounter() {
  let counts: RejectionCounts = {};
  return {
    add(reason: RejectionReason) {
      counts[reason] = (counts[reason] ?? 0) + 1;
    },
    /** Return the counters and reset them; `null` when nothing was rejected. */
    drain(): RejectionCounts | null {
      const snapshot = counts;
      counts = {};
      return Object.keys(snapshot).length > 0 ? snapshot : null;
    },
  };
}
