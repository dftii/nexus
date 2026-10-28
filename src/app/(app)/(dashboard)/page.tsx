import { navMetadata } from "@/config/navigation";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getDashboardData } from "@/features/dashboard/data";

export const metadata = navMetadata("/");

export default async function OverviewPage() {
  const data = await getDashboardData();
  return <DashboardView data={data} />;
}
