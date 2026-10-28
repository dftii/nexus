import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatChange {
  direction: "up" | "down" | "flat";
  /** Formatted change, e.g. "+4.2%". The sign is part of the text. */
  text: string;
  /** What the change is measured against, e.g. "vs previous 30 days". */
  comparison: string;
}

interface StatCardProps {
  label: string;
  /** Pre-formatted value. */
  value: string;
  /** One line defining the metric. */
  hint?: string;
  change?: StatChange;
  className?: string;
}

const changeStyles = {
  up: { Icon: TrendingUp, className: "text-success", word: "Up" },
  down: { Icon: TrendingDown, className: "text-danger", word: "Down" },
  flat: { Icon: Minus, className: "text-muted-foreground", word: "No change" },
} as const;

/**
 * A single metric: label, large tabular value, period-over-period change and
 * a definition. The change is conveyed by icon, sign and a screen-reader word,
 * never by colour alone.
 */
export function StatCard({
  label,
  value,
  hint,
  change,
  className,
}: StatCardProps) {
  const style = change ? changeStyles[change.direction] : null;
  return (
    <Card className={className}>
      <CardContent>
        <dl className="space-y-1">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </dd>
          {change && style ? (
            <dd className="flex flex-wrap items-center gap-x-1.5 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium tabular-nums",
                  style.className,
                )}
              >
                <style.Icon aria-hidden="true" className="size-4" />
                <span className="sr-only">{style.word}</span>
                {change.text}
              </span>
              <span className="text-muted-foreground">{change.comparison}</span>
            </dd>
          ) : null}
          {hint ? (
            <dd className="pt-1 text-xs text-muted-foreground">{hint}</dd>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}
