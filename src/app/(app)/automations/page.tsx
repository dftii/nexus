import { ComingSoon } from "@/components/common/coming-soon";
import { navMetadata } from "@/config/navigation";

export const metadata = navMetadata("/automations");

export default function AutomationsPage() {
  return <ComingSoon href="/automations" />;
}
