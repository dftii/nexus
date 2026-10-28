import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EligibleGuild } from "@/server/discord/guilds";
import { BotStatusBadge } from "./bot-status";
import { CommunityAvatar } from "./community-avatar";
import { GuildSelectForm } from "./guild-select-form";

export const REASON_LABEL = {
  owner: "Owner",
  administrator: "Administrator",
  manage_server: "Manage Server",
} as const;

/**
 * One row of the onboarding list. `selected` is true for the community the
 * user is currently working in; it gets an indicator instead of a button.
 */
export function GuildCard({
  guild,
  selected,
}: {
  guild: EligibleGuild;
  selected: boolean;
}) {
  return (
    <li
      data-selected={selected ? "true" : undefined}
      className="flex flex-col gap-4 px-4 py-4 data-[selected=true]:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <CommunityAvatar name={guild.name} iconUrl={guild.iconUrl} />
        <div className="min-w-0 space-y-1.5">
          <p className="truncate font-medium">{guild.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{REASON_LABEL[guild.reason]}</Badge>
            {guild.inNexus ? (
              <BotStatusBadge
                status={guild.botStatus}
                label={
                  guild.botStatus === "not_installed"
                    ? "In NEXUS · bot not installed"
                    : undefined
                }
              />
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">
                Not in NEXUS yet
              </Badge>
            )}
            {selected ? (
              <Badge className="gap-1">
                <Check aria-hidden="true" />
                Selected
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {selected ? (
        <Button asChild size="sm" variant="outline">
          <Link href="/" aria-label={`Open overview of ${guild.name}`}>
            Open overview
          </Link>
        </Button>
      ) : (
        <GuildSelectForm
          guildId={guild.id}
          guildName={guild.name}
          alreadyInNexus={guild.alreadySelected}
        />
      )}
    </li>
  );
}
