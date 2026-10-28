import {
  Activity,
  type LucideIcon,
  Gavel,
  UserMinus,
  UserPlus,
  UserCog,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeUtc } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityEventType } from "../types";

const eventMeta: Record<
  ActivityEventType,
  { label: string; Icon: LucideIcon }
> = {
  join: { label: "Joined", Icon: UserPlus },
  leave: { label: "Left", Icon: UserMinus },
  role_change: { label: "Role change", Icon: UserCog },
  moderation: { label: "Moderation", Icon: Gavel },
};

interface ActivityFeedProps {
  events: readonly ActivityEvent[];
  title?: string;
  description?: string;
  className?: string;
}

/** Chronological list of server events. Handles an empty list itself. */
export function ActivityFeed({
  events,
  title = "Recent activity",
  description,
  className,
}: ActivityFeedProps) {
  return (
    <Card role="region" aria-label={title} className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Joins, leaves, role changes and moderation actions will show up here."
          />
        ) : (
          <ol className="divide-y">
            {events.map((event) => {
              const { label, Icon } = eventMeta[event.type];
              return (
                <li key={event.id} className="flex gap-3 py-3 first:pt-0">
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
                      <span className="text-sm font-medium text-foreground">
                        {label}
                      </span>
                      <time dateTime={event.timestamp} className="tabular-nums">
                        {formatDateTimeUtc(event.timestamp)}
                      </time>
                    </div>
                    <p className="font-mono text-[0.8125rem] break-all">
                      {event.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {event.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
