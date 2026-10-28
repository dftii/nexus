import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getNavItem } from "@/config/navigation";

/**
 * Honest placeholder for a section that is on the roadmap but not built.
 * Content comes from the nav config so the sidebar, the header title and this
 * page never disagree.
 */
export function ComingSoon({ href }: { href: string }) {
  const item = getNavItem(href);
  if (!item) throw new Error(`No navigation item for ${href}`);
  const Icon = item.icon;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
          <Badge variant="outline">Coming soon</Badge>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {item.label} is not available yet
          </h2>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
        {item.planned ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Planned for Phase {item.phase} of the roadmap
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {item.planned.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          This section is not built yet, so there is nothing to configure or
          show here. The Overview shows the state of your connected server.
        </p>
        <Button asChild variant="secondary">
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back to Overview
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
