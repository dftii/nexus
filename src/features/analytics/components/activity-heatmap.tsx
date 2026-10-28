import { ChartCard } from "@/components/common/chart-card";
import { formatNumber } from "@/lib/format";
import type { Heatmap } from "@/server/activity";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const hourLabel = (h: number) => String(h).padStart(2, "0");

/** Messages by weekday x hour (UTC) as a real table, shaded by volume. */
export function ActivityHeatmap({
  heatmap,
  days,
}: {
  heatmap: Heatmap;
  days: number;
}) {
  let summary = "No messages in this period.";
  if (heatmap.total > 0) {
    let best = { day: 0, hour: 0, count: -1 };
    heatmap.cells.forEach((row, day) =>
      row.forEach((count, hour) => {
        if (count > best.count) best = { day, hour, count };
      }),
    );
    summary = `${formatNumber(heatmap.total)} messages in the last ${days} days. Busiest slot: ${WEEKDAYS[best.day]} ${hourLabel(best.hour)}:00 UTC with ${formatNumber(best.count)}.`;
  }

  return (
    <ChartCard
      title="Activity by hour and weekday"
      description={`Messages in the last ${days} days, by UTC hour`}
      summary={summary}
      footnote="Darker cells have more messages. All times are UTC."
    >
      <div
        role="region"
        aria-label="Activity heatmap, scrollable"
        tabIndex={0}
        className="overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <table className="w-full min-w-[40rem] border-separate border-spacing-0.5 text-[0.6875rem]">
          <caption className="sr-only">
            Messages by weekday and UTC hour, last {days} days
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                Weekday
              </th>
              {Array.from({ length: 24 }, (_, h) => (
                <th
                  key={h}
                  scope="col"
                  className="font-normal text-muted-foreground tabular-nums"
                >
                  {hourLabel(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.cells.map((row, day) => (
              <tr key={WEEKDAYS[day]}>
                <th
                  scope="row"
                  className="pr-2 text-left font-normal text-muted-foreground"
                >
                  {WEEKDAYS[day]}
                </th>
                {row.map((count, hour) => (
                  <td
                    key={hour}
                    title={`${WEEKDAYS[day]} ${hourLabel(hour)}:00 UTC: ${formatNumber(count)} messages`}
                    className="h-6 rounded-sm bg-muted/40"
                    style={
                      count > 0
                        ? {
                            backgroundColor: `color-mix(in oklab, var(--chart-2) ${Math.round(20 + (80 * count) / heatmap.max)}%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <span className="sr-only">{formatNumber(count)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
