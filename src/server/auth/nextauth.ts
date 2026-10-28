import "server-only";

import NextAuth from "next-auth";
import { buildAuthConfig } from "./config";

/**
 * Auth.js entry point. The config is a function, so it is evaluated per
 * request instead of at import time (no database or auth variable is needed
 * to import this module).
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() =>
  buildAuthConfig(),
);
