import { describe, expect, it, vi } from "vitest";
import { createAllowlist } from "@/bot/services/allowlist";
import { createCommunityCache } from "@/bot/services/community-cache";
import { createHeartbeat } from "@/bot/services/heartbeat";
import { createInstallationService } from "@/bot/services/installation";
import { silentLogger } from "@/bot/services/logger";
import {
  createFakeBotRepository,
  createFakeDirectory,
} from "../helpers/fake-bot-repo";

const G1 = "123456789012345678"; // allowlisted, has community
const G2 = "234567890123456789"; // allowlisted, has community
const G_NO_COMMUNITY = "345678901234567890"; // allowlisted, no community
const G_OTHER = "999999999999999999"; // not allowlisted (has a community)

const T0 = new Date("2026-10-29T10:00:00.000Z");
const T1 = new Date("2026-10-29T11:00:00.000Z");

function setup(options: {
  present?: Record<string, "present" | "unavailable" | "absent">;
  connectedAt?: Date | null;
  allow?: string[];
  logger?: Parameters<typeof createInstallationService>[0]["logger"];
}) {
  const fake = createFakeBotRepository([
    {
      id: "com_1",
      discordGuildId: G1,
      botConnectedAt: options.connectedAt ?? null,
    },
    { id: "com_2", discordGuildId: G2, botConnectedAt: null },
    { id: "com_other", discordGuildId: G_OTHER, botConnectedAt: null },
  ]);
  const allowlist = createAllowlist(options.allow ?? [G1, G2, G_NO_COMMUNITY]);
  const logger = options.logger ?? silentLogger;
  const cache = createCommunityCache({
    repository: fake.repo,
    allowlist,
    logger,
  });
  const dir = createFakeDirectory(options.present ?? {});
  let current = T0;
  const installation = createInstallationService({
    repository: fake.repo,
    cache,
    allowlist,
    directory: dir.directory,
    logger,
    now: () => current,
  });
  return {
    fake,
    allowlist,
    cache,
    dir,
    installation,
    setNow: (d: Date) => (current = d),
  };
}

describe("installation: reconcile on ready", () => {
  it("connects present allowlisted communities and clears absent ones", async () => {
    const s = setup({ present: { [G1]: "present" }, connectedAt: null });
    // G2 was connected before but is no longer present (removed while offline)
    s.fake.communities.get("com_2")!.botConnectedAt = new Date("2026-01-01");
    expect(await s.installation.reconcile()).toBe(true);
    const com1 = s.fake.communities.get("com_1")!;
    expect(com1.botConnectedAt).toEqual(T0);
    expect(com1.botLastSeenAt).toEqual(T0);
    const com2 = s.fake.communities.get("com_2")!;
    expect(com2.botConnectedAt).toBeNull();
    expect(s.installation.reconciled).toBe(true);
  });

  it("never touches non-allowlisted communities, present or not", async () => {
    const s = setup({
      present: { [G1]: "present", [G_OTHER]: "present" },
    });
    await s.installation.reconcile();
    const other = s.fake.communities.get("com_other")!;
    expect(other.botConnectedAt).toBeNull();
    expect(other.botLastSeenAt).toBeNull();
    expect(s.fake.repo.findCommunitiesByGuildIds).toHaveBeenCalledWith([
      G1,
      G2,
      G_NO_COMMUNITY,
    ]);
  });

  it("does not create communities for allowlisted guilds without one", async () => {
    const s = setup({ present: { [G_NO_COMMUNITY]: "present" } });
    await s.installation.reconcile();
    expect(s.fake.communities.size).toBe(3);
  });

  it("does not overwrite an existing botConnectedAt", async () => {
    const first = new Date("2026-01-01T00:00:00.000Z");
    const s = setup({ present: { [G1]: "present" }, connectedAt: first });
    await s.installation.reconcile();
    const com1 = s.fake.communities.get("com_1")!;
    expect(com1.botConnectedAt).toEqual(first);
    expect(com1.botLastSeenAt).toEqual(T0);
  });

  it("leaves unavailable guilds alone (neither connect nor clear)", async () => {
    const first = new Date("2026-01-01T00:00:00.000Z");
    const s = setup({ present: { [G1]: "unavailable" }, connectedAt: first });
    await s.installation.reconcile();
    const com1 = s.fake.communities.get("com_1")!;
    expect(com1.botConnectedAt).toEqual(first);
    expect(com1.botLastSeenAt).toBeNull();
  });

  it("does nothing with an empty allowlist (fail closed)", async () => {
    const s = setup({ present: { [G1]: "present" }, allow: [] });
    await s.installation.reconcile();
    expect(s.fake.repo.findCommunitiesByGuildIds).not.toHaveBeenCalled();
    expect(s.fake.repo.markConnected).not.toHaveBeenCalled();
    expect(s.fake.repo.touch).not.toHaveBeenCalled();
  });

  it("returns false and stays unreconciled when the database is down", async () => {
    const s = setup({ present: { [G1]: "present" } });
    s.fake.control.failAll = true;
    expect(await s.installation.reconcile()).toBe(false);
    expect(s.installation.reconciled).toBe(false);
  });

  it("logs the count of ignored guilds, never their ids", async () => {
    const info = vi.fn();
    const s = setup({
      present: { [G1]: "present", [G_OTHER]: "present" },
      logger: { ...silentLogger, info },
    });
    await s.installation.reconcile();
    const call = info.mock.calls.find(([event]) => event === "reconcile_done");
    expect(call?.[1]).toMatchObject({ ignoredGuilds: 1, present: 1 });
    expect(JSON.stringify(info.mock.calls)).not.toContain(G_OTHER);
  });
});

describe("installation: guildCreate / guildDelete", () => {
  it("guildCreate connects an allowlisted guild with a community", async () => {
    const s = setup({ present: { [G1]: "present" } });
    await s.installation.onGuildAvailable(G1);
    const com1 = s.fake.communities.get("com_1")!;
    expect(com1.botConnectedAt).toEqual(T0);
    expect(com1.botLastSeenAt).toEqual(T0);
    expect(s.cache.get(G1)?.botConnectedAt).toEqual(T0);
  });

  it("guildCreate keeps the first botConnectedAt (outage recovery)", async () => {
    const s = setup({ present: { [G1]: "present" }, connectedAt: T0 });
    s.setNow(T1);
    await s.installation.onGuildAvailable(G1);
    const com1 = s.fake.communities.get("com_1")!;
    expect(com1.botConnectedAt).toEqual(T0);
    expect(com1.botLastSeenAt).toEqual(T1);
  });

  it("guildCreate ignores non-allowlisted guilds and unknown communities", async () => {
    const s = setup({ present: { [G_OTHER]: "present" } });
    await s.installation.onGuildAvailable(G_OTHER);
    await s.installation.onGuildAvailable(G_NO_COMMUNITY);
    expect(s.fake.repo.markConnected).not.toHaveBeenCalled();
    expect(s.fake.communities.size).toBe(3);
  });

  it("guildDelete (real removal) clears botConnectedAt but keeps history", async () => {
    const s = setup({ present: { [G1]: "present" }, connectedAt: T0 });
    await s.cache.refresh();
    s.fake.communities.get("com_1")!.botLastSeenAt = T0;
    await s.installation.onGuildRemoved(G1, false);
    const com1 = s.fake.communities.get("com_1")!;
    expect(com1.botConnectedAt).toBeNull();
    expect(com1.botLastSeenAt).toEqual(T0);
    expect(s.cache.get(G1)?.botConnectedAt).toBeNull();
  });

  it("guildDelete during an outage (unavailable) does NOT clear", async () => {
    const s = setup({ present: { [G1]: "unavailable" }, connectedAt: T0 });
    await s.cache.refresh();
    await s.installation.onGuildRemoved(G1, true);
    expect(s.fake.communities.get("com_1")!.botConnectedAt).toEqual(T0);
    expect(s.fake.repo.markDisconnected).not.toHaveBeenCalled();
  });

  it("guildDelete ignores non-allowlisted guilds", async () => {
    const s = setup({});
    await s.installation.onGuildRemoved(G_OTHER, false);
    expect(s.fake.repo.markDisconnected).not.toHaveBeenCalled();
  });

  it("handler errors are swallowed (logged), never thrown", async () => {
    const s = setup({ present: { [G1]: "present" } });
    s.fake.control.failAll = true;
    await expect(s.installation.onGuildAvailable(G1)).resolves.toBeUndefined();
    await expect(
      s.installation.onGuildRemoved(G1, false),
    ).resolves.toBeUndefined();
  });
});

describe("heartbeat", () => {
  function beat(s: ReturnType<typeof setup>, onTick?: () => void) {
    return createHeartbeat({
      repository: s.fake.repo,
      cache: s.cache,
      allowlist: s.allowlist,
      directory: s.dir.directory,
      installation: s.installation,
      logger: silentLogger,
      intervalMs: 60_000,
      now: () => T1,
      onTick,
    });
  }

  it("touches only present allowlisted communities with one updateMany", async () => {
    const s = setup({
      present: { [G1]: "present", [G2]: "absent", [G_OTHER]: "present" },
    });
    await s.installation.reconcile();
    vi.mocked(s.fake.repo.touch).mockClear();
    await beat(s).tick();
    expect(s.fake.repo.touch).toHaveBeenCalledTimes(1);
    expect(s.fake.repo.touch).toHaveBeenCalledWith(["com_1"], T1);
    expect(s.fake.communities.get("com_1")!.botLastSeenAt).toEqual(T1);
    expect(s.fake.communities.get("com_2")!.botLastSeenAt).toBeNull();
    expect(s.fake.communities.get("com_other")!.botLastSeenAt).toBeNull();
  });

  it("does not touch unavailable guilds", async () => {
    const s = setup({ present: { [G1]: "present", [G2]: "unavailable" } });
    await s.installation.reconcile();
    vi.mocked(s.fake.repo.touch).mockClear();
    await beat(s).tick();
    expect(s.fake.repo.touch).toHaveBeenCalledWith(["com_1"], T1);
  });

  it("connects a community that appeared in NEXUS after startup", async () => {
    const s = setup({ present: { [G1]: "present", [G2]: "present" } });
    // Start with only com_1 existing; com_2 shows up later.
    const late = s.fake.communities.get("com_2")!;
    s.fake.communities.delete("com_2");
    await s.installation.reconcile();
    s.fake.communities.set("com_2", late);
    s.setNow(T1);
    await beat(s).tick();
    expect(late.botConnectedAt).toEqual(T1);
    expect(late.botLastSeenAt).toEqual(T1);
  });

  it("a failing heartbeat only logs and never marks offline", async () => {
    const warn = vi.fn();
    const s = setup({
      present: { [G1]: "present" },
      connectedAt: T0,
      logger: { ...silentLogger, warn },
    });
    await s.installation.reconcile();
    s.fake.control.failAll = true;
    vi.mocked(s.fake.repo.markDisconnected).mockClear();
    await expect(beat(s).tick()).resolves.toBeUndefined();
    expect(s.fake.repo.markDisconnected).not.toHaveBeenCalled();
    expect(s.fake.communities.get("com_1")!.botConnectedAt).not.toBeNull();
  });

  it("skips while the gateway is not ready", async () => {
    const s = setup({ present: { [G1]: "present" } });
    await s.installation.reconcile();
    vi.mocked(s.fake.repo.touch).mockClear();
    s.dir.state.ready = false;
    await beat(s).tick();
    expect(s.fake.repo.touch).not.toHaveBeenCalled();
  });

  it("retries the full reconcile if the ready-time one failed", async () => {
    const s = setup({ present: { [G1]: "present" } });
    s.fake.control.failAll = true;
    await s.installation.reconcile();
    s.fake.control.failAll = false;
    await beat(s).tick();
    expect(s.installation.reconciled).toBe(true);
    expect(s.fake.communities.get("com_1")!.botConnectedAt).toEqual(T0);
  });

  it("does nothing with an empty allowlist and still runs onTick", async () => {
    const onTick = vi.fn();
    const s = setup({ present: { [G1]: "present" }, allow: [] });
    await beat(s, onTick).tick();
    expect(s.fake.repo.touch).not.toHaveBeenCalled();
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("start/stop drive the interval timer", async () => {
    vi.useFakeTimers();
    try {
      const s = setup({ present: { [G1]: "present" } });
      await s.installation.reconcile();
      vi.mocked(s.fake.repo.touch).mockClear();
      const hb = beat(s);
      hb.start();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(s.fake.repo.touch).toHaveBeenCalledTimes(1);
      hb.stop();
      await vi.advanceTimersByTimeAsync(120_000);
      expect(s.fake.repo.touch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
