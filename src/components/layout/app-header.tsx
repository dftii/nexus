import { DemoIndicator } from "./demo-indicator";
import { HeaderTitle } from "./header-title";
import { MobileNav } from "./mobile-nav";
import { UserPlaceholder } from "./user-placeholder";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) items-center gap-3 border-b bg-background px-4 sm:px-6 lg:px-8">
      <MobileNav />
      <div className="min-w-0 flex-1">
        <HeaderTitle />
      </div>
      <DemoIndicator />
      <UserPlaceholder />
    </header>
  );
}
