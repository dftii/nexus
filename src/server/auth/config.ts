import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import { getAuthEnv } from "@/lib/env";
import { getDb } from "@/server/db";
import { mapDiscordProfile } from "./profile";
import { toPublicSession } from "./session";
import { syncDiscordSignIn } from "./sync";

/** The only OAuth scopes NEXUS asks for. `email` is intentionally absent. */
export const DISCORD_SCOPES = "identify guilds";

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_DAY = 60 * 60 * 24;

/**
 * Auth.js configuration, built per request (see `index.ts`) so importing it
 * needs neither the database nor any auth variable: `next build` and the tests
 * run without them.
 */
export function buildAuthConfig(): NextAuthConfig {
  const { AUTH_DISCORD_ID, AUTH_DISCORD_SECRET } = getAuthEnv();

  return {
    // Prisma 7 + a custom client output: the adapter's types still point at
    // `@prisma/client`, so the structurally compatible generated client is cast.
    adapter: PrismaAdapter(
      getDb() as unknown as Parameters<typeof PrismaAdapter>[0],
    ),
    session: { strategy: "database", maxAge: THIRTY_DAYS, updateAge: ONE_DAY },
    pages: { signIn: "/login", error: "/login" },
    providers: [
      Discord({
        clientId: AUTH_DISCORD_ID,
        clientSecret: AUTH_DISCORD_SECRET,
        // Discord sends `iss` on the callback (RFC 9207). The built-in
        // provider declares no issuer, so Auth.js compares it against its
        // "https://authjs.dev" fallback and rejects the callback.
        issuer: "https://discord.com",
        authorization: { params: { scope: DISCORD_SCOPES } },
        profile: (profile) => mapDiscordProfile(profile),
      }),
    ],
    callbacks: {
      // Whitelist, never spread: see toPublicSession.
      session: ({ session, user }) =>
        toPublicSession(user, session.expires) as unknown as typeof session,
    },
    events: { signIn: (event) => syncDiscordSignIn(event) },
    // Auth.js logs whole error objects, whose causes can include response
    // bodies. Log only the error type so no token or secret reaches the logs.
    logger: {
      error(error) {
        // `name` is minified in production builds; `type` is the stable label.
        const label = "type" in error ? String(error.type) : error.name;
        console.error(`[auth] ${label}`);
      },
      warn(code) {
        console.warn(`[auth] ${code}`);
      },
      debug() {},
    },
  };
}
