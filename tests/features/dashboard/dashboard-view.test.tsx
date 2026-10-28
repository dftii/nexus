// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { buildDemoDashboardData } from "@/features/dashboard/data/demo";

// The chart internals (recharts) need layout APIs jsdom does not have; the
// surrounding cards, summaries and hidden tables are what these tests cover.
vi.mock("@/features/dashboard/components/membership-growth-chart", () => ({
  MembershipGrowthChart: () => <div data-testid="growth-chart" />,
}));
vi.mock("@/features/dashboard/components/message-activity-chart", () => ({
  MessageActivityChart: () => <div data-testid="activity-chart" />,
}));

const data = buildDemoDashboardData();

describe("ActivityFeed", () => {
  it("shows an empty state when there are no events", () => {
    render(<ActivityFeed events={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders one item per event, in the given order", () => {
    render(<ActivityFeed events={data.recentActivity} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(data.recentActivity.length);
    expect(items[0]).toHaveTextContent(data.recentActivity[0]!.username);
  });

  it("labels each event by type in text, not only by icon", () => {
    render(<ActivityFeed events={data.recentActivity} />);
    const labels = new Set(["Joined", "Left", "Role change", "Moderation"]);
    for (const item of screen.getAllByRole("listitem")) {
      const text = item.textContent ?? "";
      expect([...labels].some((label) => text.includes(label))).toBe(true);
    }
  });
});

describe("DashboardView", () => {
  it("shows the demo banner and demo-labelled metrics for demo data", () => {
    render(<DashboardView data={data} />);
    expect(
      screen.getByText(/Demo data — no Discord server connected/),
    ).toBeInTheDocument();
    const labels = screen.getAllByRole("term").map((t) => t.textContent);
    expect(labels).toEqual([
      "Total members",
      "Active members",
      "Messages (demo)",
      "New members",
    ]);
  });

  it("hides the demo banner and labels when the data is live", () => {
    render(<DashboardView data={{ ...data, source: "live" }} />);
    expect(screen.queryByText(/Demo data/)).not.toBeInTheDocument();
    const labels = screen.getAllByRole("term").map((t) => t.textContent);
    expect(labels).toContain("Messages");
    expect(labels).not.toContain("Messages (demo)");
  });

  it("gives each chart a labelled region and a data table", () => {
    render(<DashboardView data={data} />);
    const growth = screen.getByRole("region", {
      name: /Membership growth/,
    });
    expect(growth).toHaveAccessibleDescription(/Total members went from/);
    const table = within(growth).getByRole("table", {
      name: /Total members, joins and leaves per day/,
    });
    // header row + one row per day
    expect(within(table).getAllByRole("row")).toHaveLength(
      data.membership.length + 1,
    );

    const activity = screen.getByRole("region", { name: /Activity \(demo\)/ });
    expect(within(activity).getByRole("table")).toBeInTheDocument();
  });

  it("shows empty states instead of charts when the series are empty", () => {
    render(
      <DashboardView
        data={{
          ...data,
          membership: [],
          messageActivity: [],
          recentActivity: [],
        }}
      />,
    );
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    // Charts are mocked, so their own empty states are covered by the cards
    // still rendering with a clear summary.
    expect(
      screen.getAllByText(
        /No (membership|message activity) (data )?is available/,
      ).length,
    ).toBeGreaterThan(0);
  });
});
