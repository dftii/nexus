/**
 * Minimal in-memory stand-in for the Prisma client, covering exactly the calls
 * the server modules make. It is deliberately dumb: no real query engine, only
 * the lookups those modules use. Failures are injected through `hooks`.
 */
export interface AccountRow {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  scope: string | null;
  token_type: string | null;
}

export interface CommunityRow {
  id: string;
  discordGuildId: string;
  name: string;
  iconUrl: string | null;
  ownerId: string | null;
  botConnectedAt: Date | null;
}

export interface MembershipRow {
  id: string;
  userId: string;
  communityId: string;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  joinedAt: Date;
  lastVerifiedAt: Date | null;
}

export interface UserRow {
  id: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  image?: string | null;
}

type Dict = Record<string, unknown>;

export function createFakeDb() {
  const state = {
    accounts: [] as AccountRow[],
    communities: [] as CommunityRow[],
    memberships: [] as MembershipRow[],
    users: [] as UserRow[],
  };
  const hooks = {
    /** Called at the start of every community upsert; may throw. */
    beforeCommunityUpsert: undefined as undefined | (() => void),
    /** Called at the start of every `$transaction`; may throw. */
    beforeTransaction: undefined as undefined | (() => void),
    /** Called by every `account` method; may throw. */
    beforeAccountCall: undefined as undefined | (() => void),
  };
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}_${++seq}`;

  const pick = <T extends Dict>(row: T, select?: Dict): unknown => {
    if (!select) return { ...row };
    const out: Dict = {};
    for (const key of Object.keys(select)) {
      if (select[key]) out[key] = row[key];
    }
    return out;
  };

  const communityWithMemberships = (c: CommunityRow, userId?: string) => ({
    ...c,
    memberships: state.memberships
      .filter((m) => m.communityId === c.id && (!userId || m.userId === userId))
      .map((m) => ({ id: m.id })),
  });

  const db = {
    account: {
      findFirst: async ({
        where,
        select,
      }: {
        where: { id?: string; userId?: string; provider?: string };
        select?: Dict;
      }) => {
        hooks.beforeAccountCall?.();
        const row = state.accounts.find(
          (a) =>
            (where.id === undefined || a.id === where.id) &&
            (where.userId === undefined || a.userId === where.userId) &&
            (where.provider === undefined || a.provider === where.provider),
        );
        return row ? pick(row as unknown as Dict, select) : null;
      },
      update: async ({
        where,
        data,
      }: {
        where: {
          id?: string;
          provider_providerAccountId?: {
            provider: string;
            providerAccountId: string;
          };
        };
        data: Partial<AccountRow>;
      }) => {
        hooks.beforeAccountCall?.();
        const row = state.accounts.find((a) =>
          where.id
            ? a.id === where.id
            : a.provider === where.provider_providerAccountId?.provider &&
              a.providerAccountId ===
                where.provider_providerAccountId?.providerAccountId,
        );
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return { ...row };
      },
    },
    user: {
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Dict;
      }) => {
        const row = state.users.find((u) => u.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return { ...row };
      },
    },
    community: {
      findMany: async ({
        where,
        select,
      }: {
        where: { discordGuildId: { in: string[] } };
        select?: { memberships?: { where?: { userId?: string } } };
      }) =>
        state.communities
          .filter((c) => where.discordGuildId.in.includes(c.discordGuildId))
          .map((c) =>
            communityWithMemberships(c, select?.memberships?.where?.userId),
          ),
      findUnique: async ({
        where,
      }: {
        where: { discordGuildId: string };
        select?: Dict;
      }) => {
        const row = state.communities.find(
          (c) => c.discordGuildId === where.discordGuildId,
        );
        return row ? { ...row } : null;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { discordGuildId: string };
        create: Omit<CommunityRow, "id" | "botConnectedAt">;
        update: Partial<CommunityRow>;
        select?: Dict;
      }) => {
        hooks.beforeCommunityUpsert?.();
        const existing = state.communities.find(
          (c) => c.discordGuildId === where.discordGuildId,
        );
        if (existing) {
          Object.assign(existing, update);
          return { id: existing.id };
        }
        const row: CommunityRow = {
          id: nextId("com"),
          botConnectedAt: null,
          ...create,
        };
        state.communities.push(row);
        return { id: row.id };
      },
    },
    communityMembership: {
      findMany: async ({
        where,
        select,
      }: {
        where: { userId: string };
        select?: Dict;
      }) =>
        state.memberships
          .filter((m) => m.userId === where.userId)
          .sort(
            (a, b) =>
              b.joinedAt.getTime() - a.joinedAt.getTime() ||
              b.id.localeCompare(a.id),
          )
          .map((m) => membershipView(m, select)),
      findUnique: async ({
        where,
        select,
      }: {
        where: { userId_communityId: { userId: string; communityId: string } };
        select?: Dict;
      }) => {
        const { userId, communityId } = where.userId_communityId;
        const row = state.memberships.find(
          (m) => m.userId === userId && m.communityId === communityId,
        );
        return row ? membershipView(row, select) : null;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { userId_communityId: { userId: string; communityId: string } };
        create: Omit<MembershipRow, "id" | "joinedAt">;
        update: Partial<MembershipRow>;
      }) => {
        const { userId, communityId } = where.userId_communityId;
        const existing = state.memberships.find(
          (m) => m.userId === userId && m.communityId === communityId,
        );
        if (existing) {
          Object.assign(existing, update);
          return { ...existing };
        }
        const row: MembershipRow = {
          id: nextId("mem"),
          joinedAt: new Date(Date.now() + seq),
          ...create,
        };
        state.memberships.push(row);
        return { ...row };
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      hooks.beforeTransaction?.();
      return fn(db);
    },
  };

  function membershipView(m: MembershipRow, select?: Dict) {
    const community = state.communities.find((c) => c.id === m.communityId);
    const full: Dict = { ...m, community };
    return select ? selectDeep(full, select) : full;
  }

  function selectDeep(full: Dict, select: Dict): Dict {
    const out: Dict = {};
    for (const key of Object.keys(select)) {
      const spec = select[key];
      if (!spec) continue;
      if (typeof spec === "object" && spec !== null && "select" in spec) {
        out[key] = pick(full[key] as Dict, (spec as { select: Dict }).select);
      } else {
        out[key] = full[key];
      }
    }
    return out;
  }

  return { db, state, hooks };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
