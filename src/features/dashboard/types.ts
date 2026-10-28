/**
 * Types for the Overview dashboard.
 *
 * `DashboardData` is the contract between the data layer and the UI. The demo
 * generator is one implementation; a later phase adds a real source (queries
 * over ingested Discord events) that returns the same shape with
 * `source: "live"`.
 */

export type DataSource = "demo" | "live";

/** Period-over-period change for one number. */
export interface Delta {
  /** current - previous */
  absolute: number;
  /** (current - previous) / previous, or null when previous is 0 */
  ratio: number | null;
  direction: "up" | "down" | "flat";
}

export interface Metric {
  value: number;
  /** Value for the preceding period of the same length. */
  previous: number;
  delta: Delta;
}

export interface DashboardSummary {
  totalMembers: Metric;
  /** Members who sent at least one message in the last 7 days. */
  activeMembers: Metric;
  /** Messages sent during the period. */
  messages: Metric;
  /** Members who joined during the period. */
  newMembers: Metric;
}

export interface MembershipPoint {
  /** UTC calendar day, YYYY-MM-DD */
  date: string;
  /** Total members at the end of the day. */
  members: number;
  joins: number;
  leaves: number;
}

export interface MessagePoint {
  /** UTC calendar day, YYYY-MM-DD */
  date: string;
  messages: number;
}

export type ActivityEventType = "join" | "leave" | "role_change" | "moderation";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  /** ISO 8601 timestamp (UTC) */
  timestamp: string;
  /** Synthetic username (always obviously fake in demo data). */
  username: string;
  /** What happened, e.g. "Timed out for 10 minutes (spam links)". */
  detail: string;
}

export interface DashboardData {
  source: DataSource;
  /** Last day covered by the data, YYYY-MM-DD (UTC). */
  endDate: string;
  /** Length of the comparison period for `summary`, in days. */
  periodDays: number;
  summary: DashboardSummary;
  /** Daily membership, oldest first. */
  membership: MembershipPoint[];
  /** Daily messages for the last `periodDays` days, oldest first. */
  messageActivity: MessagePoint[];
  /** Newest first. */
  recentActivity: ActivityEvent[];
}
