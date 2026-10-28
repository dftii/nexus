"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest)
      : null;

  return (
    <div role="alert" className="mx-auto w-full max-w-xl">
      <EmptyState
        icon={TriangleAlert}
        title="The dashboard could not be loaded"
        description={
          digest
            ? `Something went wrong while preparing this page (reference ${digest}). Try again.`
            : "Something went wrong while preparing this page. Try again."
        }
        action={
          <Button type="button" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
