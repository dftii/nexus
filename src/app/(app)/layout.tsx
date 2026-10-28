import { AppShell } from "@/components/layout/app-shell";
import { HeaderAccount } from "@/features/auth/components/header-account";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell account={<HeaderAccount />}>{children}</AppShell>;
}
