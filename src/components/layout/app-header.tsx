import { DemoIndicator } from "./demo-indicator";
import { HeaderTitle } from "./header-title";
import { MobileNav } from "./mobile-nav";

/**
 * `account` is the right-hand slot (user menu or sign-in link). It is passed
 * in so the layout components stay free of server and feature imports.
 */
export function AppHeader({ account }: { account?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) items-center gap-3 border-b bg-background px-4 sm:px-6 lg:px-8">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <HeaderTitle />
      </div>
      <DemoIndicator />
      {account}
    </header>
  );
}
