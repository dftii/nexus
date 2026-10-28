import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton while the guild list is fetched from Discord. */
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading your servers...</span>
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-56" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
