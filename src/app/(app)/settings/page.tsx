import { ComingSoon } from "@/components/common/coming-soon";
import { navMetadata } from "@/config/navigation";

export const metadata = navMetadata("/settings");

export default function SettingsPage() {
  return <ComingSoon href="/settings" />;
}
