import type { PrismaClient } from "@/generated/prisma/client";

/** Shared seeding/reading helpers for the Phase 4 bot integration tests. */

let counter = 0;
const nextId = () => `9${String(++counter).padStart(17, "0")}`;

export async function createCommunity(db: PrismaClient, name = "c") {
  const id = nextId();
  return db.community.create({
    data: { discordGuildId: `1${id.slice(1)}`, name: `${name}-${id}` },
  });
}

export interface SeedEvent {
  /** ISO instant (UTC) the message was sent. */
  at: string;
  author?: string;
  channel?: string;
  /** ISO instant the row was stored; defaults to a long time ago. */
  storedAt?: string;
  /** Reuse a Discord message id (duplicate delivery). */
  messageId?: string;
}

export async function seedEvents(
  db: PrismaClient,
  communityId: string,
  events: SeedEvent[],
) {
  await db.messageEvent.createMany({
    skipDuplicates: true,
    data: events.map((e) => ({
      communityId,
      discordMessageId: e.messageId ?? nextId(),
      discordGuildId: "g",
      discordChannelId: e.channel ?? "ch1",
      authorDiscordId: e.author ?? "u1",
      occurredAt: new Date(e.at),
      createdAt: new Date(e.storedAt ?? "2026-01-01T00:00:00.000Z"),
    })),
  });
}

/** `n` events spread over one day for one author each (cheap bulk seeding). */
export const eventsOn = (
  day: string,
  n: number,
  extra: Partial<SeedEvent> = {},
) =>
  Array.from({ length: n }, (_, i) => ({
    at: `${day}T10:${String(i % 60).padStart(2, "0")}:00.000Z`,
    author: `u${i}`,
    ...extra,
  }));

export async function communityRows(db: PrismaClient, communityId: string) {
  const rows = await db.communityDailyActivity.findMany({
    where: { communityId },
    orderBy: { day: "asc" },
  });
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    messages: r.messageCount,
    authors: r.authorCount,
  }));
}

export async function channelRows(db: PrismaClient, communityId: string) {
  const rows = await db.channelDailyActivity.findMany({
    where: { communityId },
    orderBy: [{ day: "asc" }, { discordChannelId: "asc" }],
  });
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    channel: r.discordChannelId,
    messages: r.messageCount,
    authors: r.authorCount,
  }));
}

export async function watermark(db: PrismaClient, communityId: string) {
  const c = await db.community.findUniqueOrThrow({
    where: { id: communityId },
  });
  return {
    through: c.analyticsFinalizedThrough?.toISOString().slice(0, 10) ?? null,
    at: c.analyticsAggregatedAt,
  };
}

export const rawCount = (db: PrismaClient, communityId: string) =>
  db.messageEvent.count({ where: { communityId } });

/**
 * The authoritative all-time total: aggregates for days <= W plus raw events
 * after W. Never both sources for the same day.
 */
export async function allTimeMessages(db: PrismaClient, communityId: string) {
  const community = await db.community.findUniqueOrThrow({
    where: { id: communityId },
  });
  const w = community.analyticsFinalizedThrough;
  const fromAggregates = w
    ? ((
        await db.communityDailyActivity.aggregate({
          where: { communityId, day: { lte: w } },
          _sum: { messageCount: true },
        })
      )._sum.messageCount ?? 0)
    : 0;
  const fromRaw = await db.messageEvent.count({
    where: {
      communityId,
      ...(w ? { occurredAt: { gte: new Date(w.getTime() + 86_400_000) } } : {}),
    },
  });
  return fromAggregates + fromRaw;
}

/**
 * Wrap a client so the Nth `community.update` inside a transaction throws,
 * simulating a crash after the aggregate rows were written.
 */
export function failingOnce(db: PrismaClient): PrismaClient {
  let armed = true;
  const wrapTx = (tx: object) =>
    new Proxy(tx, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target) as unknown;
        if (prop === "community") {
          return new Proxy(value as object, {
            get(model, method) {
              const fn = Reflect.get(model, method, model) as (
                ...args: unknown[]
              ) => unknown;
              if (method === "update" && armed) {
                return () => {
                  armed = false;
                  throw new Error("simulated crash");
                };
              }
              return typeof fn === "function" ? fn.bind(model) : fn;
            },
          });
        }
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
  return new Proxy(db, {
    get(target, prop) {
      if (prop === "$transaction") {
        return (fn: (tx: object) => unknown, options?: unknown) =>
          target.$transaction(
            (tx) => fn(wrapTx(tx)) as never,
            options as never,
          );
      }
      const value = Reflect.get(target, prop, target) as unknown;
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}
