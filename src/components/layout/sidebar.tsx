import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** Fixed desktop sidebar (lg and up). Below lg the same nav lives in MobileNav. */
export function Sidebar() {
  return (
    <div className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width) flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
      <div className="flex h-8 items-center px-3">
        <Brand />
      </div>
      <SidebarNav />
    </div>
  );
}
