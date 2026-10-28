import { ComingSoon } from "@/components/common/coming-soon";
import { navMetadata } from "@/config/navigation";

export const metadata = navMetadata("/moderation");

export default function ModerationPage() {
  return <ComingSoon href="/moderation" />;
}
