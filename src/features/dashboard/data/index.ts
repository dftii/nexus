import type { DashboardData } from "../types";
import { buildDemoDashboardData } from "./demo";

/**
 * Data access for the Overview dashboard.
 *
 * Today this always returns deterministic demo data. When the bot and event
 * ingestion exist (Phase 3/4), resolve the selected community here and return
 * the same `DashboardData` shape with `source: "live"`; the UI does not
 * change.
 */
export async function getDashboardData(): Promise<DashboardData> {
  return buildDemoDashboardData();
}
