"use server";

import { redirect } from "next/navigation";
import { isAuthConfigured } from "@/lib/env";
import { signIn, signOut } from "@/server/auth";
import { safeRedirectPath } from "./redirect";

/**
 * Start the Discord sign-in. Used as a form `action` on /login. An optional
 * `redirectTo` field is accepted but restricted to same-site paths.
 */
export async function signInWithDiscordAction(
  formData: FormData,
): Promise<void> {
  if (!isAuthConfigured()) redirect("/login?error=Configuration");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  // Throws a redirect to Discord's authorization page.
  await signIn("discord", { redirectTo });
}

/** Delete the database session and the cookie, then go to /login. */
export async function signOutAction(): Promise<void> {
  if (!isAuthConfigured()) redirect("/login");
  await signOut({ redirectTo: "/login" });
}
