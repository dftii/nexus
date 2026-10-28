import { buildMetric, sum } from "../lib/delta";
import { mulberry32, noise } from "../lib/prng";
import type {
  ActivityEvent,
  ActivityEventType,
  DashboardData,
  MembershipPoint,
  MessagePoint,
} from "../types";

/**
 * Deterministic synthetic data for demo mode.
 *
 * Nothing here reads the clock or Math.random: the reference end date and the
 * seed are constants, so server rendering, client hydration and tests all see
 * identical output. A real data source (a later phase) replaces this module
 * behind `getDashboardData()`.
 */

/** Fixed reference "today" for the demo (UTC calendar day). */
export const DEMO_END_DATE = "2026-10-26";
export const DEMO_SEED = 20261026;
/** Days of membership history generated. */
export const HISTORY_DAYS = 90;
/** Comparison period for the summary cards and the activity chart. */
export const PERIOD_DAYS = 30;

const MEMBERS_BEFORE_HISTORY = 4_820;
const FEED_LENGTH = 8;

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Day of week for a UTC calendar day (0 = Sunday). */
function weekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

// Messages are busier towards the weekend (index = getUTCDay()).
const WEEKDAY_MESSAGE_FACTOR = [1.15, 0.92, 0.95, 1, 1, 1.1, 1.25] as const;
const WEEKDAY_JOIN_BONUS = [3, 0, 0, 0, 1, 3, 5] as const;

interface DayRecord {
  date: string;
  joins: number;
  leaves: number;
  members: number;
  messages: number;
  activeMembers: number;
}

function buildDays(endDate: string, seed: number): DayRecord[] {
  const random = mulberry32(seed);
  const days: DayRecord[] = [];
  let members = MEMBERS_BEFORE_HISTORY;

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const date = addDays(endDate, i - (HISTORY_DAYS - 1));
    const dow = weekday(date);
    const progress = i / (HISTORY_DAYS - 1);

    // A single "event day" bump keeps the series from looking too smooth.
    const eventBump = i === 61 ? 38 : 0;
    const joins = Math.max(
      3,
      Math.round(
        22 +
          progress * 9 +
          WEEKDAY_JOIN_BONUS[dow]! +
          noise(random) * 6 +
          eventBump,
      ),
    );
    const leaves = Math.max(
      0,
      Math.round(joins * (0.36 + noise(random) * 0.08)),
    );
    members += joins - leaves;

    const messages = Math.round(
      1_850 *
        (1 + progress * 0.14) *
        WEEKDAY_MESSAGE_FACTOR[dow]! *
        (1 + noise(random) * 0.12),
    );

    // "Active" = sent at least one message in the 7 days up to this day.
    const activeRatio = 0.3 + progress * 0.035 + noise(random) * 0.012;
    const activeMembers = Math.min(
      members,
      Math.max(0, Math.round(members * activeRatio)),
    );

    days.push({ date, joins, leaves, members, messages, activeMembers });
  }
  return days;
}

const NAME_PARTS_A = [
  "pixel",
  "ember",
  "nova",
  "quartz",
  "lunar",
  "turbo",
  "mossy",
  "cobalt",
  "static",
  "velvet",
  "orbit",
  "glitch",
] as const;
const NAME_PARTS_B = [
  "fox",
  "owl",
  "wisp",
  "golem",
  "sprite",
  "knight",
  "otter",
  "comet",
  "rogue",
  "drifter",
  "badger",
  "pilot",
] as const;

const ROLES = ["Contributor", "Event Host", "Verified", "Helper"] as const;
const MOD_REASONS = [
  "Timed out for 10 minutes (spam links)",
  "Warned for off-topic posting",
  "Message removed (repeated invites)",
  "Timed out for 1 hour (harassment report)",
] as const;
const JOIN_SOURCES = [
  "Joined through an invite link",
  "Joined from server discovery",
  "Joined through an invite link",
] as const;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function pickType(random: () => number): ActivityEventType {
  const roll = random();
  if (roll < 0.45) return "join";
  if (roll < 0.65) return "leave";
  if (roll < 0.85) return "role_change";
  return "moderation";
}

function buildFeed(endDate: string, seed: number): ActivityEvent[] {
  const random = mulberry32(seed ^ 0x9e3779b9);
  // The latest event happens in the evening of the reference day.
  let time = Date.parse(`${endDate}T20:00:00Z`);
  const events: ActivityEvent[] = [];

  for (let i = 0; i < FEED_LENGTH; i++) {
    const type = pickType(random);
    const username = `${pick(NAME_PARTS_A, random)}_${pick(NAME_PARTS_B, random)}_demo`;
    let detail: string;
    switch (type) {
      case "join":
        detail = pick(JOIN_SOURCES, random);
        break;
      case "leave":
        detail = `Member for ${3 + Math.floor(random() * 400)} days`;
        break;
      case "role_change":
        detail = `Granted the ${pick(ROLES, random)} role`;
        break;
      case "moderation":
        detail = `${pick(MOD_REASONS, random)} by demo_mod`;
        break;
    }
    events.push({
      id: `demo-evt-${String(i + 1).padStart(2, "0")}`,
      type,
      timestamp: new Date(time).toISOString(),
      username,
      detail,
    });
    // Step back 7 to 95 minutes between events.
    time -= (7 + Math.floor(random() * 89)) * 60_000;
  }
  return events;
}

export interface DemoOptions {
  /** Last day covered, YYYY-MM-DD (UTC). Defaults to DEMO_END_DATE. */
  endDate?: string;
  seed?: number;
}

/** Build the complete demo dashboard data set. Pure and deterministic. */
export function buildDemoDashboardData(
  options: DemoOptions = {},
): DashboardData {
  const endDate = options.endDate ?? DEMO_END_DATE;
  const seed = options.seed ?? DEMO_SEED;
  const days = buildDays(endDate, seed);

  const current = days.slice(-PERIOD_DAYS);
  const previous = days.slice(-2 * PERIOD_DAYS, -PERIOD_DAYS);
  const last = days[days.length - 1]!;
  const lastOfPrevious = previous[previous.length - 1]!;

  const membership: MembershipPoint[] = days.map(
    ({ date, members, joins, leaves }) => ({ date, members, joins, leaves }),
  );
  const messageActivity: MessagePoint[] = current.map(({ date, messages }) => ({
    date,
    messages,
  }));

  return {
    source: "demo",
    endDate,
    periodDays: PERIOD_DAYS,
    summary: {
      totalMembers: buildMetric(last.members, lastOfPrevious.members),
      activeMembers: buildMetric(
        last.activeMembers,
        lastOfPrevious.activeMembers,
      ),
      messages: buildMetric(
        sum(current.map((d) => d.messages)),
        sum(previous.map((d) => d.messages)),
      ),
      newMembers: buildMetric(
        sum(current.map((d) => d.joins)),
        sum(previous.map((d) => d.joins)),
      ),
    },
    membership,
    messageActivity,
    recentActivity: buildFeed(endDate, seed),
  };
}
