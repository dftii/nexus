import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RANGES, type RangeDays } from "@/lib/analytics-range";

/** `?range=` links; the active one is marked with aria-current. */
export function RangeSelector({ range }: { range: RangeDays }) {
  return (
    <nav aria-label="Time range" className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Range</span>
      {RANGES.map((days) => (
        <Button
          key={days}
          asChild
          size="sm"
          variant={days === range ? "default" : "outline"}
        >
          <Link
            href={`/analytics?range=${days}`}
            aria-current={days === range ? "page" : undefined}
          >
            {days} days
          </Link>
        </Button>
      ))}
    </nav>
  );
}
