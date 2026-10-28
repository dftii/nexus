import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

/** Header indicator shown whenever the app runs on synthetic data. */
export function DemoIndicator() {
  if (siteConfig.dataMode !== "demo") return null;
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
