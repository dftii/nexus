import "server-only";

import { getDb } from "@/server/db";
import { mapDiscordProfile } from "./profile";

interface SignInEvent {
  user?: { id?: string | null };
  account?: {
    provider?: string;
    providerAccountId?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    scope?: string;
    token_type?: string;
  } | null;
  profile?: unknown;
}

/**
 * `events.signIn` handler. Auth.js only writes the Discord profile and tokens
 * when an account is first linked; on later sign-ins it just opens a session,
 * which would leave a stale (possibly expired or revoked) token in the
 * database. This refreshes both on every sign-in.
 *
 * It never throws: a failure here must not block a valid sign-in, and the
 * error is dropped so token material cannot reach the logs.
 */
export async function syncDiscordSignIn(event: SignInEvent): Promise<void> {
  const { user, account, profile } = event;
  if (account?.provider !== "discord" || !user?.id) return;
  if (!account.providerAccountId) return;

  try {
    const db = getDb();
    const mapped = mapDiscordProfile(profile);
    await db.user.update({
      where: { id: user.id },
      data: {
        username: mapped.username,
        displayName: mapped.displayName,
        avatarUrl: mapped.avatarUrl,
        name: mapped.name,
        image: mapped.image,
      },
    });
    await db.account.update({
      where: {
        provider_providerAccountId: {
          provider: "discord",
          providerAccountId: account.providerAccountId,
        },
      },
      data: {
        ...(account.access_token ? { access_token: account.access_token } : {}),
        // Discord rotates refresh tokens; keep the newest one.
        ...(account.refresh_token
          ? { refresh_token: account.refresh_token }
          : {}),
        ...(account.expires_at !== undefined
          ? { expires_at: account.expires_at }
          : {}),
        ...(account.scope ? { scope: account.scope } : {}),
        ...(account.token_type ? { token_type: account.token_type } : {}),
      },
    });
  } catch {
    // Intentionally silent, see above.
  }
}
