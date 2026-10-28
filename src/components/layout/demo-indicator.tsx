"use client";

import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isDemoPath } from "@/config/navigation";

/**
 * Header indicator shown only on the demo route, the one place that renders
 * synthetic data. Pages for a real community never show it.
 */
export function DemoIndicator() {
  const pathname = usePathname();
  if (!isDemoPath(pathname)) return null;
  return (
    <Badge
      variant="outline"
      className="h-7 gap-1.5 border-warning/50 px-2.5 text-warning"
    >
      <FlaskConical aria-hidden="true" />
      <span>
        Demo<span className="max-sm:sr-only"> data</span>
      </span>
      <span className="sr-only">: no Discord server connected</span>
    </Badge>
  );
}
