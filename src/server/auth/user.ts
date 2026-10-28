import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isAuthConfigured } from "@/lib/env";
import { auth } from "./nextauth";
import type { PublicUser } from "./session";

/**
 * The signed-in user, or null. Reads the database session through Auth.js;
 * deduplicated per request. Returns null (never throws) when auth is not
 * configured, so every protected page fails closed.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  // Never prerender: a build without auth variables must not bake in
  // "not configured" (or any user) for requests served later.
  await connection();
  if (!isAuthConfigured()) return null;
  const session = await auth();
  const user = session?.user;
  if (!user || typeof user.id !== "string" || user.id === "") return null;
  return { id: user.id, name: user.name ?? null, image: user.image ?? null };
});

/**
 * Guard for server components, server actions and route handlers: returns the
 * user or redirects to `/login`. This (not the client, not a proxy) is what
 * protects data.
 */
export async function requireUser(): Promise<PublicUser> {
  await connection();
  if (!isAuthConfigured()) redirect("/login?error=Configuration");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
