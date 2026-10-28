import { FlaskConical } from "lucide-react";

/**
 * Persistent notice that the data on screen is synthetic. Always visible on
 * the dashboard while `source` is "demo"; it is not dismissible on purpose.
 */
export function DemoBanner() {
  return (
    <aside
      aria-label="Demo data notice"
      className="flex items-start gap-3 rounded-lg border border-warning/40 bg-card px-4 py-3 text-sm"
    >
      <FlaskConical
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-warning"
      />
      <p>
        <span className="font-medium">
          Demo data — no Discord server connected.
        </span>{" "}
        <span className="text-muted-foreground">
          Every number, chart and event on this page is generated locally and is
          not real. Connecting a server arrives with later roadmap phases.
        </span>
      </p>
    </aside>
  );
}
