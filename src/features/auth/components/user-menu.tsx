"use client";

import Link from "next/link";
import { Check, ChevronDown, LogOut, Server } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchActiveCommunityAction } from "@/features/communities/actions";
import { signOutAction } from "../actions";
import { userInitials } from "../initials";

/** Everything the menu needs is plain display data: no user id, no tokens. */
export interface UserMenuProps {
  user: { name: string | null; image: string | null };
  /** Communities the user belongs to (id + name only). */
  communities: ReadonlyArray<{ id: string; name: string }>;
  activeCommunityId: string | null;
}

/**
 * Account menu in the header: who is signed in, switching between the user's
 * communities (only when there is more than one), a link to the server picker
 * and sign out. The actions run on the server and check the session
 * themselves; nothing here grants anything.
 */
export function UserMenu({
  user,
  communities,
  activeCommunityId,
}: UserMenuProps) {
  const displayName = user.name?.trim() || "Discord user";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2.5 px-2"
          aria-label={`Account menu for ${displayName}`}
        >
          <Avatar className="size-8">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback aria-hidden="true">
              {userInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium md:block">
            {displayName}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="hidden size-4 text-muted-foreground md:block"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block text-xs font-normal text-muted-foreground">
            Signed in as
          </span>
          <span className="block truncate">{displayName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {communities.length > 1 ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Switch community
              </DropdownMenuLabel>
              {communities.map((community) => {
                const active = community.id === activeCommunityId;
                return (
                  <form key={community.id} action={switchActiveCommunityAction}>
                    <input
                      type="hidden"
                      name="communityId"
                      value={community.id}
                    />
                    <DropdownMenuItem
                      asChild
                      // Keep the menu (and so the form) mounted until the
                      // action navigates away, or the submit is lost.
                      onSelect={(event) => event.preventDefault()}
                    >
                      <button
                        type="submit"
                        className="w-full text-left"
                        aria-label={
                          active
                            ? `${community.name} (current)`
                            : community.name
                        }
                      >
                        <span className="flex-1 truncate">
                          {community.name}
                        </span>
                        {active ? <Check aria-hidden="true" /> : null}
                      </button>
                    </DropdownMenuItem>
                  </form>
                );
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <Server aria-hidden="true" />
            Change community
          </Link>
        </DropdownMenuItem>
        <form action={signOutAction}>
          <DropdownMenuItem
            asChild
            onSelect={(event) => event.preventDefault()}
          >
            <button type="submit" className="w-full text-left">
              <LogOut aria-hidden="true" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
