import { AppHeader } from "./app-header";
import { Sidebar } from "./sidebar";

/**
 * Application frame: skip link, sidebar, header and the main landmark.
 * Server component; only the nav items and the drawer are client components.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-h-dvh flex-col lg:pl-(--sidebar-width)">
        <AppHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </>
  );
}
