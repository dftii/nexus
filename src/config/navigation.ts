import type { Metadata } from "next";
import {
  BarChart3,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShieldCheck,
  Trophy,
  Workflow,
} from "lucide-react";

export type NavStatus = "available" | "soon";

export interface NavItem {
  /** Short label used in the sidebar, the header title and the page title. */
  label: string;
  href: string;
  icon: LucideIcon;
  status: NavStatus;
  /** One sentence on what the section is for. */
  description: string;
  /** Roadmap phase (docs/PROJECT_PLAN.md) that delivers the section. */
  phase?: number;
  /** What the section will contain once built. Only set for "soon" items. */
  planned?: readonly string[];
  /**
   * Where the item points while browsing the public demo, when the demo has
   * its own version of the page. Items without one keep `href`.
   */
  demoHref?: string;
}

/** The public demo lives under this path (see ADR-021). */
export const DEMO_PATH = "/demo";

/** True for the demo route (and anything below it). */
export function isDemoPath(pathname: string): boolean {
  return pathname === DEMO_PATH || pathname.startsWith(`${DEMO_PATH}/`);
}

export const navigation: readonly NavItem[] = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
    status: "available",
    description: "Members, activity and recent events at a glance.",
    demoHref: DEMO_PATH,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    status: "soon",
    phase: 4,
    description: "Deeper analytics computed from real server events.",
    planned: [
      "Growth and retention over time",
      "Activity heatmaps by hour and weekday",
      "Most active channels",
    ],
  },
  {
    label: "Automations",
    href: "/automations",
    icon: Workflow,
    status: "soon",
    phase: 5,
    description: "Rules that react to what happens in your server.",
    planned: [
      "Triggers such as a member joining, a keyword or inactivity",
      "Actions such as assigning a role or sending a message",
      "A rule editor, an execution log and a dry-run mode",
    ],
  },
  {
    label: "Moderation",
    href: "/moderation",
    icon: ShieldCheck,
    status: "soon",
    phase: 6,
    description: "Moderation actions and an audit trail in one place.",
    planned: [
      "Warn, timeout, kick and ban from NEXUS",
      "Case history for each member",
      "An audit log of actions taken by people and by the bot",
    ],
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
    status: "soon",
    phase: 7,
    description: "XP, levels and rankings that reward activity.",
    planned: [
      "Per-member XP and levels from activity",
      "Server leaderboards",
      "Role rewards with cooldowns against abuse",
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    status: "soon",
    phase: 3,
    description: "Account and community configuration.",
    planned: [
      "Installing and disconnecting the NEXUS bot for a community",
      "Roles and permissions for your team",
      "Per-feature options as each feature ships",
    ],
  },
];

/** Find the nav item for a pathname (exact match). */
export function getNavItem(pathname: string): NavItem | undefined {
  return navigation.find((item) => item.href === pathname);
}

/** The link target for `item`: its demo version while browsing the demo. */
export function resolveNavHref(item: NavItem, pathname: string): string {
  return isDemoPath(pathname) && item.demoHref ? item.demoHref : item.href;
}

/**
 * True when `pathname` belongs to `item` (exact for "/", prefix otherwise).
 * On the demo, Overview is active at `/demo` and nothing else is.
 */
export function isActivePath(item: NavItem, pathname: string): boolean {
  const href = resolveNavHref(item, pathname);
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Per-route `metadata` derived from the nav config. */
export function navMetadata(href: string): Metadata {
  const item = getNavItem(href);
  if (!item) throw new Error(`No navigation item for ${href}`);
  return { title: item.label, description: item.description };
}
