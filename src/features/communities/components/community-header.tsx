import Link from "next/link";
import { Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BotStatus } from "@/lib/bot-status";
import type { UserCommunity } from "@/server/communities";
import { BotStatusBadge } from "./bot-status";
import { CommunityAvatar } from "./community-avatar";

export const ROLE_LABEL: Record<UserCommunity["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  MODERATOR: "Moderator",
  MEMBER: "Member",
};

/** Icon, name, role, bot status and the way back to the community list. */
export function CommunityHeader({
  community,
  botStatus,
}: {
  community: UserCommunity;
  /** Omitted when the status could not be loaded. */
  botStatus?: BotStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <CommunityAvatar
        name={community.name}
        iconUrl={community.iconUrl}
        className="size-14 text-lg"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="truncate text-2xl font-semibold tracking-tight">
          {community.name}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{ROLE_LABEL[community.role]}</Badge>
          {botStatus ? <BotStatusBadge status={botStatus} /> : null}
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/onboarding">
          <Server aria-hidden="true" />
          Change community
        </Link>
      </Button>
    </div>
  );
}
