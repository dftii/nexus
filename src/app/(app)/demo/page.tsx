import type { Metadata } from "next";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getDashboardData } from "@/features/dashboard/data";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "A guided look at NEXUS with generated sample data. No sign-in needed.",
};

/**
 * Public demo: the same dashboard and shell, always on synthetic data. It
 * stays reachable without signing in; real data lives behind `/`.
 */
export default async function DemoPage() {
  const data = await getDashboardData();
  return <DashboardView data={data} />;
}
