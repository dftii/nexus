import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import type { UserCommunity } from "@/server/communities";
import { AutoRefresh } from "./auto-refresh";
import { CommunityHeader } from "./community-header";

/**
 * Typed error state for a database failure while loading the Overview. It is
 * rendered by the page (the route's error boundary is for unexpected crashes),
 * keeps the header when the community is known and retries on its own.
 */
export function OverviewUnavailable({
  community,
  href = "/",
}: {
  community: UserCommunity | null;
  /** Page the retry link returns to. */
  href?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {community ? <CommunityHeader community={community} /> : null}
      <div role="alert">
        <EmptyState
          icon={TriangleAlert}
          title="We couldn't load this community's activity"
          description="The database isn't answering right now. Nothing was changed. This page retries by itself, or you can try again."
          action={
            <Button asChild variant="outline">
              <Link href={href}>
                <RefreshCw aria-hidden="true" />
                Try again
              </Link>
            </Button>
          }
        />
      </div>
      <AutoRefresh />
    </div>
  );
}
