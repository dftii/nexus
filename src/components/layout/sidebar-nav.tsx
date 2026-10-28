"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { isActivePath, navigation, resolveNavHref } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Primary navigation list. Client component only because it needs the current
 * pathname for the active state (and to point Overview at `/demo` while
 * browsing the demo); the config it renders is static.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="space-y-1">
        {navigation.map((item) => {
          const active = isActivePath(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={resolveNavHref(item, pathname)}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary"
                  />
                ) : null}
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.status === "soon" ? (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Soon
                  </Badge>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
