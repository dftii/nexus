/**
 * The only user data that ever leaves the server through a session. Tokens,
 * the Discord id and the session token are deliberately not part of it.
 */
export interface PublicUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface PublicSession {
  user: PublicUser;
  expires: string;
}

interface DbUserLike {
  id: string;
  name?: string | null;
  displayName?: string | null;
  username?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
}

/**
 * Auth.js `session` callback body. Builds the session from scratch from three
 * whitelisted fields instead of copying the adapter's objects, so a new column
 * (or a token) can never leak by accident.
 */
export function toPublicSession(
  user: DbUserLike,
  expires: Date | string,
): PublicSession {
  return {
    user: {
      id: user.id,
      name: user.name ?? user.displayName ?? user.username ?? null,
      image: user.image ?? user.avatarUrl ?? null,
    },
    expires: expires instanceof Date ? expires.toISOString() : String(expires),
  };
}
