"use client";

import { usePathname } from "next/navigation";
import { getNavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";

/** Page title in the header, derived from the nav config for the current route. */
export function HeaderTitle() {
  const pathname = usePathname();
  const title = getNavItem(pathname)?.label ?? siteConfig.name;
  return (
    <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
  );
}
