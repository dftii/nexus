import { Radio, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BotStatus } from "@/lib/bot-status";
import {
  formatDateTimeUtc,
  formatLongDate,
  formatRelativeTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const BOT_STATUS_LABEL: Record<BotStatus, string> = {
  not_installed: "Bot not installed",
  offline: "Bot installed · offline",
  online: "Bot online",
};

/** Status chip. Colour never carries the meaning alone: the text does. */
export function BotStatusBadge({
  status,
  label = BOT_STATUS_LABEL[status],
}: {
  status: BotStatus;
  /** Replaces the default wording where more context helps. */
  label?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        status === "online" && "bg-signal/15 text-signal",
        status === "offline" && "text-warning",
        status === "not_installed" && "text-muted-foreground",
      )}
    >
      {status === "online" ? <Radio aria-hidden="true" /> : null}
      {status === "offline" ? <TriangleAlert aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
}

function heartbeatText(lastSeenAt: Date | null, now: Date): string {
  return lastSeenAt
    ? `${formatDateTimeUtc(lastSeenAt)} (${formatRelativeTime(lastSeenAt, now)})`
    : "never";
}

/** Heartbeat and collection-start facts, for the online / offline bot. */
export function BotStatusPanel({
  status,
  connectedAt,
  lastSeenAt,
  now,
}: {
  status: Exclude<BotStatus, "not_installed">;
  connectedAt: Date | null;
  lastSeenAt: Date | null;
  now: Date;
}) {
  const facts = (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Installed (collecting since)</dt>
        <dd className="font-medium">
          {connectedAt ? formatLongDate(connectedAt) : "unknown"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Last heartbeat</dt>
        <dd className="font-medium">{heartbeatText(lastSeenAt, now)}</dd>
      </div>
    </dl>
  );

  if (status === "online") {
    return (
      <Card role="status" aria-label="Bot status">
        <CardContent>{facts}</CardContent>
      </Card>
    );
  }

  return (
    <Card role="status" aria-label="Bot status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
          The bot is installed but not reporting
        </CardTitle>
        <CardDescription>
          The bot process has not sent a heartbeat recently, so it is not
          running or cannot reach Discord. Start it with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
            npm run bot:dev
          </code>
          . Messages sent while it is off are not recorded. The numbers below
          are what was collected before it stopped.
        </CardDescription>
      </CardHeader>
      <CardContent>{facts}</CardContent>
    </Card>
  );
}
