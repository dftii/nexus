import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-52" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

/** Skeleton shaped like /analytics: header, key numbers, two charts, a table. */
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-6"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading analytics...</span>
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <ChartSkeleton />
    </div>
  );
}
