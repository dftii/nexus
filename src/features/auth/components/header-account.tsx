import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { getActiveCommunity, listUserCommunities } from "@/server/communities";
import { UserMenu, type UserMenuProps } from "./user-menu";

/**
 * Menu data for the signed-in user, or null for a visitor. Plain display data
 * only. It must never break a page (the public demo has to render even when
 * the session store is down), so any failure degrades to "signed out".
 */
async function loadMenuProps(): Promise<UserMenuProps | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const [communities, active] = await Promise.all([
      listUserCommunities(user.id),
      getActiveCommunity(user.id),
    ]);
    return {
      user: { name: user.name, image: user.image },
      communities: communities.map(({ id, name }) => ({ id, name })),
      activeCommunityId: active?.id ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Header slot for the account: the user menu when signed in, a "Sign in" link
 * otherwise (the public demo has no session). Server component: it reads the
 * session and hands the client menu plain display data only.
 */
export async function HeaderAccount() {
  const menu = await loadMenuProps();
  if (menu) return <UserMenu {...menu} />;
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/login">
        <LogIn aria-hidden="true" />
        Sign in
      </Link>
    </Button>
  );
}
