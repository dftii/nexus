import "server-only";

import { getBotStatus, type BotStatus } from "@/lib/bot-status";
import { getActiveCommunity, type UserCommunity } from "@/server/communities";
import { getDb } from "@/server/db";

export interface OverviewBot {
  status: BotStatus;
  /** Start of collection for the current installation. */
  connectedAt: Date | null;
  /** Last heartbeat that included the guild. */
  lastSeenAt: Date | null;
}

export type ActivityResult<T> =
  | {
      status: "ok";
      community: UserCommunity;
      bot: OverviewBot;
      /** Null while the bot is not installed: nothing is collected. */
      activity: T | null;
    }
  /** The database failed; `community` is known only if it loaded before. */
  | { status: "error"; community: UserCommunity | null };

export interface ActivityContext {
  community: UserCommunity;
  bot: OverviewBot;
  /** W: days up to here are read from the aggregate tables. */
  finalizedThrough: Date | null;
  aggregatedAt: Date | null;
}

/**
 * Shared entry of every community-scoped activity page. The community comes
 * ONLY from `getActiveCommunity` (membership-validated, the cookie is a hint);
 * `load` receives that id's context and is skipped while the bot is not
 * installed. Returns null when the user has no community (the page redirects
 * to onboarding). Never throws: a failure becomes `{ status: "error" }`.
 */
export async function loadActivity<T>(
  userId: string,
  now: Date,
  load: (ctx: ActivityContext) => Promise<T>,
): Promise<ActivityResult<T> | null> {
  let community: UserCommunity | null = null;
  try {
    community = await getActiveCommunity(userId);
    if (!community) return null;

    const row = await getDb().community.findUnique({
      where: { id: community.id },
      select: {
        botConnectedAt: true,
        botLastSeenAt: true,
        analyticsFinalizedThrough: true,
        analyticsAggregatedAt: true,
      },
    });
    if (!row) return { status: "error", community };

    const bot: OverviewBot = {
      status: getBotStatus(row, now),
      connectedAt: row.botConnectedAt,
      lastSeenAt: row.botLastSeenAt,
    };
    if (bot.status === "not_installed") {
      return { status: "ok", community, bot, activity: null };
    }
    const activity = await load({
      community,
      bot,
      finalizedThrough: row.analyticsFinalizedThrough,
      aggregatedAt: row.analyticsAggregatedAt,
    });
    return { status: "ok", community, bot, activity };
  } catch {
    // Details (connection strings, SQL) never reach the page.
    return { status: "error", community };
  }
}
