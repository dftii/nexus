import { Client, GatewayIntentBits, Options } from "discord.js";

/**
 * The bot's Gateway intents. EXACTLY these two, no more:
 * - `Guilds`: guild create/delete (installation tracking) and the guild cache.
 * - `GuildMessages`: message events (metadata only; content is never read).
 *
 * Deliberately NOT requested: MessageContent, GuildMembers, GuildPresences
 * (privileged, and not needed for Phase 3).
 */
export const BOT_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
] as const;

export function createBotClient(): Client {
  return new Client({
    intents: [...BOT_INTENTS],
    // Messages are processed as they arrive and never kept: no message cache.
    makeCache: Options.cacheWithLimits({ MessageManager: 0 }),
  });
}
