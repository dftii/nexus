export const siteConfig = {
  name: "NEXUS",
  description:
    "Community management and analytics for Discord servers: insights, automations and moderation in one place.",
  /**
   * Where app data comes from. Until a Discord server can be connected
   * (Phase 2 onwards, see docs/PROJECT_PLAN.md) the whole app runs on
   * synthetic demo data and says so in the UI.
   */
  dataMode: "demo",
} as const;
