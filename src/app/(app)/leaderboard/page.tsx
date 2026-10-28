import { ComingSoon } from "@/components/common/coming-soon";
import { navMetadata } from "@/config/navigation";

export const metadata = navMetadata("/leaderboard");

export default function LeaderboardPage() {
  return <ComingSoon href="/leaderboard" />;
}
