import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional call to action (a Button or link) that fills the empty area. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shown where a list or chart has nothing to display. It states what is
 * missing and, when there is one, the action that fixes it.
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
      ) : null}
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
