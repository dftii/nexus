import { useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  /** Visible one-line description under the title. */
  description?: string;
  /**
   * Plain-language summary of what the chart shows (trend, range, extremes).
   * Hidden visually, announced by assistive tech as the region's description.
   */
  summary: string;
  /** The chart itself. */
  children: React.ReactNode;
  /** Visually hidden data table with the chart's numbers (see SrDataTable). */
  table?: React.ReactNode;
  /** Small print under the chart, e.g. "Y axis starts at 4,800". */
  footnote?: string;
  className?: string;
}

/**
 * Titled panel for a chart. It is a labelled region whose description is a
 * text summary, and it hosts a hidden data table next to the chart.
 */
export function ChartCard({
  title,
  description,
  summary,
  children,
  table,
  footnote,
  className,
}: ChartCardProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;
  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      aria-describedby={summaryId}
      className={cn("min-w-0", className)}
    >
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        <p id={summaryId} className="sr-only">
          {summary}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        {table}
        {footnote ? (
          <p className="text-xs text-muted-foreground">{footnote}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
