import { vi } from "vitest";
import type {
  BotRepository,
  CommunityRef,
  MessageEventRecord,
} from "@/bot/services/repository";
import type {
  GuildDirectory,
  GuildPresence,
} from "@/bot/services/installation";

/** In-memory `BotRepository` with call spies and failure injection. */
export function createFakeBotRepository(initial: CommunityRef[] = []) {
  const communities = new Map<
    string,
    CommunityRef & { botLastSeenAt: Date | null }
  >(initial.map((c) => [c.id, { ...c, botLastSeenAt: null }]));
  const events = new Map<string, MessageEventRecord>();
  const control = {
    /** Number of upcoming insert calls that should reject. */
    failInserts: 0,
    failAll: false,
  };

  const maybeFail = () => {
    if (control.failAll) throw new Error("db down");
  };
  const matching = (ids: readonly string[]) =>
    [...communities.values()].filter((c) => ids.includes(c.id));

  const repo: BotRepository = {
    findCommunitiesByGuildIds: vi.fn(async (guildIds) => {
      maybeFail();
      return [...communities.values()]
        .filter((c) => guildIds.includes(c.discordGuildId))
        .map(({ id, discordGuildId, botConnectedAt }) => ({
          id,
          discordGuildId,
          botConnectedAt,
        }));
    }),
    insertMessageEvents: vi.fn(async (records) => {
      maybeFail();
      if (control.failInserts > 0) {
        control.failInserts -= 1;
        throw new Error("insert failed");
      }
      let stored = 0;
      for (const record of records) {
        if (events.has(record.discordMessageId)) continue; // skipDuplicates
        events.set(record.discordMessageId, { ...record });
        stored += 1;
      }
      return stored;
    }),
    markConnected: vi.fn(async (ids, at) => {
      maybeFail();
      const rows = matching(ids).filter((c) => c.botConnectedAt === null);
      for (const row of rows) row.botConnectedAt = at;
      return rows.length;
    }),
    markDisconnected: vi.fn(async (ids) => {
      maybeFail();
      const rows = matching(ids).filter((c) => c.botConnectedAt !== null);
      for (const row of rows) row.botConnectedAt = null;
      return rows.length;
    }),
    touch: vi.fn(async (ids, at) => {
      maybeFail();
      const rows = matching(ids);
      for (const row of rows) row.botLastSeenAt = at;
      return rows.length;
    }),
  };

  return { repo, communities, events, control };
}

export type FakeBotRepo = ReturnType<typeof createFakeBotRepository>;

/** Controllable `GuildDirectory`. */
export function createFakeDirectory(
  guilds: Record<string, GuildPresence> = {},
) {
  const state = { guilds: { ...guilds }, ready: true };
  const directory: GuildDirectory = {
    presence: (id) => state.guilds[id] ?? "absent",
    guildIds: () => Object.keys(state.guilds),
    isGatewayReady: () => state.ready,
  };
  return { directory, state };
}
