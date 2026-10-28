// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getAnalyticsData: vi.fn(),
  refresh: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/activity", async () => ({
  getAnalyticsData: mocks.getAnalyticsData,
  parseRange: (await import("@/lib/analytics-range")).parseRange,
}));
// recharts needs layout APIs jsdom lacks; cards, summaries and tables are
// what these tests cover.
vi.mock("@/features/dashboard/components/message-activity-chart", () => ({
  MessageActivityChart: ({ dataKey }: { dataKey?: string }) => (
    <div data-testid={`chart-${dataKey}`} />
  ),
}));

import AnalyticsPage from "@/app/(app)/(protected)/analytics/page";

const NOW = new Date();
const user = { id: "user_1", name: "Ada", image: null };
const GUILD_ID = "111111111111111111";
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const community = {
  id: "com_1",
  discordGuildId: GUILD_ID,
  name: "Pixel Guild",
  iconUrl: null,
  role: "OWNER",
  botConnected: true,
};

function heatmap(withData: boolean) {
  const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  if (withData) cells[0]![9] = 12;
  return { cells, max: withData ? 12 : 0, total: withData ? 12 : 0 };
}

function ok(
  status: "not_installed" | "offline" | "online",
  overrides: Record<string, unknown> = {},
  summary: Record<string, unknown> = {},
) {
  const activity = {
    range: 30,
    heatmapDays: 30,
    summary: {
      totalEvents: 1234,
      last24h: 12,
      last7d: 99,
      activeAuthors7d: 7,
      firstEventAt: new Date("2026-10-01T08:00:00.000Z"),
      lastEventAt: new Date("2026-10-29T11:00:00.000Z"),
      ...summary,
    },
    daily: [
      { date: "2026-10-28", messages: 5, authors: 2 },
      { date: "2026-10-29", messages: 7, authors: 3 },
    ],
    channels: [
      {
        channelId: "c1",
        name: "general",
        messages: 30,
        share: 0.75,
        authors: 4,
      },
      {
        channelId: "222222222222222222",
        name: null,
        messages: 10,
        share: 0.25,
        authors: 2,
      },
    ],
    heatmap: heatmap(true),
    recent: [
      {
        id: "e1",
        occurredAt: new Date("2026-10-29T10:15:00.000Z"),
        channelId: "c1",
        channelName: "general",
        authorId: "333333333333333333",
      },
    ],
    coverage: {
      finalizedThrough: d("2026-10-28"),
      aggregatedAt: new Date("2026-10-29T10:45:00.000Z"),
      earliestAggregateDay: d("2026-10-02"),
      earliestRawAt: new Date("2026-10-01T08:00:00.000Z"),
      stale: false,
    },
    ...overrides,
  };
  return {
    status: "ok",
    community,
    bot: {
      status,
      connectedAt: status === "not_installed" ? null : d("2026-10-01"),
      lastSeenAt:
        status === "online"
          ? new Date(NOW.getTime() - 30_000)
          : new Date(NOW.getTime() - 3_600_000),
    },
    activity: status === "not_installed" ? null : activity,
  };
}

async function renderPage(range?: string | string[]) {
  render(await AnalyticsPage({ searchParams: Promise.resolve({ range }) }));
}

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-value");
  vi.stubEnv("AUTH_DISCORD_ID", "123456789012345678");
  vi.stubEnv("AUTH_DISCORD_SECRET", "test-client-secret-value");
  mocks.requireUser.mockReset().mockResolvedValue(user);
  mocks.getAnalyticsData.mockReset().mockResolvedValue(null);
  mocks.redirect.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/analytics", () => {
  it("lets requireUser redirect a visitor and reads nothing else", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mocks.getAnalyticsData).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding without a community", async () => {
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("queries only with the signed-in user's id and a validated range", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online"));
    await renderPage();
    expect(mocks.getAnalyticsData).toHaveBeenLastCalledWith(
      "user_1",
      30,
      expect.any(Date),
    );
    await renderPage("7");
    expect(mocks.getAnalyticsData).toHaveBeenLastCalledWith(
      "user_1",
      7,
      expect.any(Date),
    );
    await renderPage("90");
    expect(mocks.getAnalyticsData).toHaveBeenLastCalledWith(
      "user_1",
      90,
      expect.any(Date),
    );
    await renderPage("1000");
    expect(mocks.getAnalyticsData).toHaveBeenLastCalledWith(
      "user_1",
      30,
      expect.any(Date),
    );
    await renderPage(["7", "90"]);
    expect(mocks.getAnalyticsData).toHaveBeenLastCalledWith(
      "user_1",
      30,
      expect.any(Date),
    );
    // Nothing else (such as a community id) is ever passed.
    for (const call of mocks.getAnalyticsData.mock.calls) {
      expect(call).toHaveLength(3);
    }
  });

  it("shows the install panel, no analytics, when the bot is not installed", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("not_installed"));
    await renderPage();
    expect(
      screen.getByText("Add the NEXUS bot to Pixel Guild"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Invite bot/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Time range" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Channels")).not.toBeInTheDocument();
  });

  it("renders the full dashboard with real numbers, UTC copy and no demo data", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online"));
    await renderPage();

    expect(screen.getByText("Bot online")).toBeInTheDocument();
    expect(
      screen.queryByText("The bot is installed but not reporting"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Last 24 hours")).toBeInTheDocument();
    expect(
      screen.getByText("Today and the 6 previous UTC days"),
    ).toBeInTheDocument();
    expect(screen.getByText("Active channels")).toBeInTheDocument();
    expect(screen.getByTestId("chart-messages")).toBeInTheDocument();
    expect(screen.getByTestId("chart-authors")).toBeInTheDocument();
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();

    // Honest copy.
    const about = screen.getByRole("region", { name: "About this data" });
    expect(about).toHaveTextContent(/recorded activity/i);
    expect(about).toHaveTextContent(/bot was offline/i);
    expect(about).toHaveTextContent(/UTC/);
    expect(about).toHaveTextContent("Oct 28, 2026");
    expect(about).toHaveTextContent("Oct 29, 10:45 UTC");

    // Accessible data tables for both charts.
    expect(
      screen.getByRole("table", { name: "Messages per UTC day" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Authors per UTC day" }),
    ).toBeInTheDocument();
  });

  it("marks the selected range and links the others", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online", { range: 90 }));
    await renderPage("90");
    const nav = screen.getByRole("navigation", { name: "Time range" });
    expect(within(nav).getByRole("link", { name: "90 days" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "7 days" })).toHaveAttribute(
      "href",
      "/analytics?range=7",
    );
    expect(
      within(nav).getByRole("link", { name: "30 days" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("shows channel names with an id fallback, share and authors", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online"));
    await renderPage();
    const table = screen.getByRole("table", { name: /Messages per channel/ });
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("#general");
    expect(rows[1]).toHaveTextContent("30");
    expect(rows[1]).toHaveTextContent("75.0%");
    expect(rows[1]).toHaveTextContent("4");
    expect(rows[2]).toHaveTextContent("222222222222222222");
    expect(rows[2]).toHaveTextContent("25.0%");
  });

  it("shows a dash for channel authors on a 90 day range", async () => {
    mocks.getAnalyticsData.mockResolvedValue(
      ok("online", {
        range: 90,
        channels: [
          {
            channelId: "c1",
            name: "general",
            messages: 3,
            share: 1,
            authors: null,
          },
        ],
      }),
    );
    await renderPage("90");
    const row = within(
      screen.getByRole("table", { name: /Messages per channel/ }),
    ).getAllByRole("row")[1]!;
    expect(row).toHaveTextContent("—");
    expect(row).toHaveTextContent("not available");
    expect(
      screen.getByText(/only available for 7 and 30 day ranges/),
    ).toBeInTheDocument();
  });

  it("describes the heatmap and keeps its cells reachable by text", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online"));
    await renderPage();
    const heat = screen.getByRole("table", {
      name: /Messages by weekday and UTC hour/,
    });
    expect(within(heat).getAllByRole("row")).toHaveLength(8);
    expect(within(heat).getByText("Mon")).toBeInTheDocument();
    expect(
      within(heat).getByTitle("Mon 09:00 UTC: 12 messages"),
    ).toBeInTheDocument();
  });

  it("lists recent activity with the channel name and no message content", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online"));
    await renderPage();
    const row = within(
      screen.getByRole("region", { name: "Recent activity" }),
    ).getByRole("listitem");
    expect(row).toHaveTextContent("Oct 29, 10:15 UTC");
    expect(row).toHaveTextContent("#general");
    expect(row.textContent).not.toMatch(/content|attachment/i);
  });

  it("shows the offline banner and keeps the data", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("offline"));
    await renderPage();
    expect(
      screen.getByRole("status", { name: "Bot status" }),
    ).toHaveTextContent("The bot is installed but not reporting");
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("explains stale daily totals without hiding the numbers", async () => {
    mocks.getAnalyticsData.mockResolvedValue(
      ok("online", {
        coverage: {
          finalizedThrough: d("2026-10-25"),
          aggregatedAt: new Date("2026-10-26T01:00:00.000Z"),
          earliestAggregateDay: d("2026-10-02"),
          earliestRawAt: new Date("2026-10-20T08:00:00.000Z"),
          stale: true,
        },
      }),
    );
    await renderPage();
    const note = screen.getByRole("status", { name: "Daily totals status" });
    expect(note).toHaveTextContent("Daily totals are catching up");
    expect(note).toHaveTextContent("final through Oct 25, 2026");
    expect(note).toHaveTextContent(/still correct/);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("does not show the stale note when totals are fresh", async () => {
    mocks.getAnalyticsData.mockResolvedValue(ok("online"));
    await renderPage();
    expect(
      screen.queryByRole("status", { name: "Daily totals status" }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state, keeping the range selector, before any message", async () => {
    mocks.getAnalyticsData.mockResolvedValue(
      ok(
        "online",
        { recent: [], daily: [], channels: [], heatmap: heatmap(false) },
        {
          totalEvents: 0,
          last24h: 0,
          last7d: 0,
          activeAuthors7d: 0,
          firstEventAt: null,
          lastEventAt: null,
        },
      ),
    );
    await renderPage();
    expect(screen.getByText("No messages recorded yet")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Time range" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Channels")).not.toBeInTheDocument();
  });

  it("renders a generic error state that keeps the header and leaks nothing", async () => {
    mocks.getAnalyticsData.mockResolvedValue({ status: "error", community });
    await renderPage("7");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn't load this community's activity",
    );
    expect(alert.textContent).not.toMatch(/prisma|sql|postgres|password/i);
    expect(
      screen.getByRole("heading", { level: 2, name: "Pixel Guild" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try again/ })).toHaveAttribute(
      "href",
      "/analytics?range=7",
    );
  });
});
