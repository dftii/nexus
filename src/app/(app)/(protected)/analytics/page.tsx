import { ComingSoon } from "@/components/common/coming-soon";
import { navMetadata } from "@/config/navigation";

export const metadata = navMetadata("/analytics");

export default function AnalyticsPage() {
  return <ComingSoon href="/analytics" />;
}
