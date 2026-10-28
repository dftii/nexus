import Link from "next/link";
import {
  ExternalLink,
  RefreshCw,
  ServerOff,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithDiscordAction } from "@/features/auth/actions";
import { DiscordSubmitButton } from "@/features/auth/components/discord-submit-button";
import type { EligibleGuildsResult } from "@/server/discord/guilds";
import { formatSeconds, retrySeconds } from "../error-message";
import { GuildCard } from "./guild-card";

export const DISCORD_PERMISSIONS_HELP =
  "https://support.discord.com/hc/en-us/articles/206029707-How-do-I-set-up-Permissions";

function Intro() {
  return (
    <header className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">
        Connect a Discord server
      </h2>
      <p className="max-w-2xl text-muted-foreground">
        Pick the server you want to manage with NEXUS. We list the servers where
        you are the owner, an administrator, or have the Manage Server
        permission.
      </p>
      <ul className="max-w-2xl list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          Choosing a server only reads which servers you can manage. NEXUS does
          not change anything in Discord.
        </li>
        <li>
          Live analytics need the NEXUS bot in the server. Until it is
          installed, the overview explains how to add it instead of showing
          numbers.
        </li>
      </ul>
    </header>
  );
}

/** A notice card for the states where the list could not be loaded. */
function Notice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <Card role="status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{action}</CardContent>
    </Card>
  );
}

function ReloadLink({ children = "Reload the list" }: { children?: string }) {
  return (
    <Button asChild variant="outline">
      <Link href="/onboarding">
        <RefreshCw aria-hidden="true" />
        {children}
      </Link>
    </Button>
  );
}

/**
 * Body of `/onboarding` for each outcome of `getEligibleGuilds`. Pure
 * presentation: the page does the session check and the data loading.
 * `activeCommunityId` marks the community the user is currently working in.
 */
export function OnboardingView({
  result,
  activeCommunityId,
}: {
  result: EligibleGuildsResult;
  activeCommunityId: string | null;
}) {
  let body: React.ReactNode;

  switch (result.status) {
    case "reauth_required":
      body = (
        <Notice
          title="Reconnect your Discord account"
          description="Your Discord authorization expired or was revoked, so we can't check which servers you manage. Sign in with Discord again to continue."
          action={
            <form action={signInWithDiscordAction}>
              <input type="hidden" name="redirectTo" value="/onboarding" />
              <DiscordSubmitButton pendingLabel="Redirecting to Discord...">
                Reconnect Discord
              </DiscordSubmitButton>
            </form>
          }
        />
      );
      break;
    case "rate_limited":
      body = (
        <Notice
          title="Discord is asking us to slow down"
          description={`Too many requests were sent to Discord. Try again in about ${formatSeconds(retrySeconds(result.retryAfter))}.`}
          action={<ReloadLink>Try again</ReloadLink>}
        />
      );
      break;
    case "unavailable":
      body = (
        <Notice
          title="We couldn't reach Discord"
          description="Discord (or our connection to it) isn't answering right now. Nothing was changed. Reload in a moment."
          action={<ReloadLink />}
        />
      );
      break;
    case "ok":
      body =
        result.guilds.length === 0 ? (
          <EmptyState
            icon={ServerOff}
            title="No servers you can manage"
            description="NEXUS only lists servers where you are the owner, an administrator, or have the Manage Server permission. Ask a server admin to grant you one of those, then reload."
            className="py-10"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="outline">
                  <a
                    href={DISCORD_PERMISSIONS_HELP}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    How Discord permissions work
                    <ExternalLink aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/demo">Explore the demo</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <section aria-labelledby="servers-heading" className="space-y-3">
            <h3 id="servers-heading" className="text-sm font-medium">
              Your servers ({result.guilds.length})
            </h3>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {result.guilds.map((guild) => (
                <GuildCard
                  key={guild.id}
                  guild={guild}
                  selected={
                    guild.communityId !== null &&
                    guild.communityId === activeCommunityId
                  }
                />
              ))}
            </ul>
          </section>
        );
      break;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Intro />
      {body}
    </div>
  );
}
