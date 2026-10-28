"use client";

import { usePathname } from "next/navigation";
import { getNavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";

/** Titles for routes that are not in the nav config. */
const EXTRA_TITLES: Record<string, string> = {
  "/demo": "Demo",
  "/onboarding": "Choose a server",
};

/** Page title in the header, derived from the nav config for the current route. */
export function HeaderTitle() {
  const pathname = usePathname();
  const title =
    getNavItem(pathname)?.label ?? EXTRA_TITLES[pathname] ?? siteConfig.name;
  return (
    <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
  );
}
