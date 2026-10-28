import Link from "next/link";
import { ArrowRight, BotOff, Hourglass, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserCommunity } from "@/server/communities";
import { CommunityAvatar } from "./community-avatar";

const ROLE_LABEL: Record<UserCommunity["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  MODERATOR: "Moderator",
  MEMBER: "Member",
};

/** What the Overview will show once the bot and ingestion exist. */
const FUTURE_CONTENT = [
  "Total and active members, with change over time",
  "Membership growth and daily message activity",
  "A feed of recent joins, leaves and activity",
] as const;

function CommunityHeader({ community }: { community: UserCommunity }) {
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
          <Badge variant="secondary" className="text-muted-foreground">
            {community.botConnected ? "Bot connected" : "Bot not connected"}
          </Badge>
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

/**
 * The Overview for a real community. There is no live data yet, so this never
 * renders numbers: not-connected explains why and what comes next; a
 * connected bot (not possible before Phase 3) gets a neutral placeholder.
 * Demo figures live only on `/demo`.
 */
export function CommunityOverview({ community }: { community: UserCommunity }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <CommunityHeader community={community} />

      {community.botConnected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hourglass
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              Live analytics are coming
            </CardTitle>
            <CardDescription>
              The NEXUS bot is connected to {community.name}, but analytics
              built from real server events arrive in Phase 4. Nothing is shown
              here until then.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BotOff
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              {community.name} is not connected to the NEXUS bot
            </CardTitle>
            <CardDescription>
              You selected this server, so NEXUS knows you manage it. Live
              analytics need the NEXUS bot to be in the server to collect
              events, and the bot arrives in Phase 3. There is no data to show
              yet, and NEXUS does not make any up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                What will appear here once the bot is connected
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {FUTURE_CONTENT.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled aria-describedby="invite-bot-note">
                Invite bot: coming in Phase 3
              </Button>
              <Button asChild variant="secondary">
                <Link href="/demo">
                  See what it will look like
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <p id="invite-bot-note" className="text-xs text-muted-foreground">
              The demo uses generated sample data, clearly labelled as such.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
