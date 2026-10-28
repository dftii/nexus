import { requireUser } from "@/server/auth";

/**
 * Everything under this group needs a signed-in user. This check is a first
 * gate only: layouts are not re-rendered on client-side navigation, so every
 * page or action that reads user data must call `requireUser()` itself.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return children;
}
