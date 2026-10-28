import Link from "next/link";
import { ArrowRight, BotOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const READS = [
  "Message metadata only: the message id, channel id, author id and timestamp.",
  "Never the message text, embeds, attachments, mentions or member lists.",
  "Only messages sent after the bot is installed; no history is read.",
] as const;

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-all text-foreground">
      {children}
    </code>
  );
}

/**
 * Overview body while the bot is not installed: what it reads, what it asks
 * for, the invite button and what to do next. `inviteUrl` is built on the
 * server (it is null when Discord sign-in is not configured).
 */
export function BotInstallPanel({
  communityName,
  discordGuildId,
  inviteUrl,
}: {
  communityName: string;
  discordGuildId: string;
  inviteUrl: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotOff aria-hidden="true" className="size-4 text-muted-foreground" />
          Add the NEXUS bot to {communityName}
        </CardTitle>
        <CardDescription>
          NEXUS builds its analytics from events the bot receives from Discord.
          Until it is installed there is no data to show, and NEXUS does not
          make any up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <section aria-labelledby="bot-reads-heading" className="space-y-2">
            <h3 id="bot-reads-heading" className="text-sm font-medium">
              What the bot reads
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {READS.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="bot-perms-heading" className="space-y-2">
            <h3 id="bot-perms-heading" className="text-sm font-medium">
              Permissions requested
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>View Channels, so Discord delivers the message events.</li>
              <li>
                It does not ask to send messages, manage anything or be an
                administrator.
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-2">
          {inviteUrl ? (
            <Button asChild>
              <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                Invite bot
                <ExternalLink aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          ) : (
            <>
              <Button type="button" disabled aria-describedby="invite-note">
                Invite bot
              </Button>
              <p id="invite-note" className="text-xs text-muted-foreground">
                The invite link is unavailable because Discord sign-in is not
                configured on this NEXUS installation (
                <Code>AUTH_DISCORD_ID</Code>).
              </p>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Installation is confirmed by the bot itself, not by opening the
            link.
          </p>
        </div>

        <section aria-labelledby="bot-steps-heading" className="space-y-2">
          <h3 id="bot-steps-heading" className="text-sm font-medium">
            Next steps
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Approve the invitation in Discord.</li>
            <li>
              Make sure this server&apos;s id, <Code>{discordGuildId}</Code>, is
              listed in <Code>DISCORD_GUILD_ALLOWLIST</Code>.
            </li>
            <li>
              Start the bot with <Code>npm run bot:dev</Code>.
            </li>
            <li>Refresh this page; it also updates by itself.</li>
          </ol>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/demo">
              See what it will look like
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            The demo uses generated sample data, clearly labelled as such.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
