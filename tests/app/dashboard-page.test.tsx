// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOverviewData: vi.fn(),
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
vi.mock("@/server/activity", () => ({
  getOverviewData: mocks.getOverviewData,
}));

import OverviewPage from "@/app/(app)/(protected)/page";

const NOW = new Date();
const user = { id: "user_1", name: "Ada", image: null };
const CLIENT_ID = "123456789012345678";
const GUILD_ID = "111111111111111111";

function community(overrides: Record<string, unknown> = {}) {
  return {
    id: "com_1",
    discordGuildId: GUILD_ID,
    name: "Pixel Guild",
    iconUrl: null,
    role: "OWNER",
    botConnected: false,
    ...overrides,
  };
}

const emptySummary = {
  totalEvents: 0,
  last24h: 0,
  last7d: 0,
  activeAuthors7d: 0,
  firstEventAt: null,
  lastEventAt: null,
};

function data(
  status: "not_installed" | "offline" | "online",
  extra: {
    summary?: Record<string, unknown>;
    recent?: unknown[];
    lastSeenAt?: Date | null;
  } = {},
) {
  const connectedAt =
    status === "not_installed" ? null : new Date("2026-10-20T08:00:00.000Z");
  const lastSeenAt =
    extra.lastSeenAt === undefined
      ? status === "online"
        ? new Date(NOW.getTime() - 30_000)
        : new Date(NOW.getTime() - 3_600_000)
      : extra.lastSeenAt;
  return {
    status: "ok",
    community: community(),
    bot: { status, connectedAt, lastSeenAt },
    activity:
      status === "not_installed"
        ? null
        : {
            summary: { ...emptySummary, ...extra.summary },
            recent: extra.recent ?? [],
          },
  };
}

async function renderPage() {
  render(await OverviewPage());
}

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-value");
  vi.stubEnv("AUTH_DISCORD_ID", CLIENT_ID);
  vi.stubEnv("AUTH_DISCORD_SECRET", "test-client-secret-value");
  mocks.requireUser.mockReset().mockResolvedValue(user);
  mocks.getOverviewData.mockReset().mockResolvedValue(null);
  mocks.redirect.mockClear();
  mocks.refresh.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/ (Overview)", () => {
  it("lets requireUser redirect an unauthenticated visitor and reads nothing else", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mocks.getOverviewData).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding when the user has no community", async () => {
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
    expect(mocks.getOverviewData).toHaveBeenCalledWith(
      "user_1",
      expect.any(Date),
    );
  });

  it("shows the install panel with a real invite link when the bot is not installed", async () => {
    mocks.getOverviewData.mockResolvedValue(data("not_installed"));
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 2, name: "Pixel Guild" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Bot not installed")).toBeInTheDocument();
    expect(
      screen.getByText("Add the NEXUS bot to Pixel Guild"),
    ).toBeInTheDocument();
    expect(screen.getByText(/never the message text/i)).toBeInTheDocument();
    expect(screen.getByText(/View Channels/)).toBeInTheDocument();

    const invite = screen.getByRole("link", { name: /Invite bot/ });
    expect(invite).toHaveAttribute(
      "href",
      `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot&permissions=1024&guild_id=${GUILD_ID}&disable_guild_select=true`,
    );
    expect(invite).toHaveAttribute("target", "_blank");
    expect(invite).toHaveAttribute("rel", "noopener noreferrer");
    expect(invite.getAttribute("href")).not.toMatch(/secret/i);

    const steps = within(
      screen.getByRole("region", { name: "Next steps" }),
    ).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent("Approve the invitation in Discord");
    expect(steps[1]).toHaveTextContent(GUILD_ID);
    expect(steps[1]).toHaveTextContent("DISCORD_GUILD_ALLOWLIST");
    expect(steps[2]).toHaveTextContent("npm run bot:dev");
    expect(steps[3]).toHaveTextContent("Refresh this page");
    expect(
      screen.getByText(/confirmed by the bot itself, not by opening the link/),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /See what it will look like/ }),
    ).toHaveAttribute("href", "/demo");
    expect(
      screen.getByRole("link", { name: /Change community/ }),
    ).toHaveAttribute("href", "/onboarding");
    // No metrics before the bot exists.
    expect(screen.queryByText("Messages recorded")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent activity")).not.toBeInTheDocument();
  });

  it("disables the invite button with an explanation when auth is not configured", async () => {
    vi.stubEnv("AUTH_DISCORD_ID", "");
    mocks.getOverviewData.mockResolvedValue(data("not_installed"));
    await renderPage();

    expect(
      screen.queryByRole("link", { name: /Invite bot/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite bot/ })).toBeDisabled();
    expect(screen.getByText(/sign-in is not configured/)).toBeInTheDocument();
  });

  it("shows the offline state with the last heartbeat and the metrics collected so far", async () => {
    mocks.getOverviewData.mockResolvedValue(
      data("offline", {
        summary: {
          totalEvents: 42,
          last24h: 5,
          last7d: 30,
          activeAuthors7d: 4,
        },
        recent: [
          {
            id: "e1",
            occurredAt: new Date("2026-10-28T10:15:00.000Z"),
            channelId: "222222222222222222",
            authorId: "333333333333333333",
          },
        ],
      }),
    );
    await renderPage();

    expect(screen.getByText("Bot installed · offline")).toBeInTheDocument();
    const status = screen.getByRole("status", { name: "Bot status" });
    expect(status).toHaveTextContent("The bot is installed but not reporting");
    expect(status).toHaveTextContent("npm run bot:dev");
    expect(status).toHaveTextContent("Installed (collecting since)");
    expect(status).toHaveTextContent("Oct 20, 2026");
    expect(status).toHaveTextContent("Last heartbeat");
    expect(status).toHaveTextContent("1 h ago");

    expect(screen.getByText("Messages recorded")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Since Oct 20, 2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Invite bot/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /See what it will look like/ }),
    ).not.toBeInTheDocument();
  });

  it("says 'never' when an installed bot has no heartbeat yet", async () => {
    mocks.getOverviewData.mockResolvedValue(
      data("offline", { lastSeenAt: null }),
    );
    await renderPage();
    expect(
      within(screen.getByRole("status", { name: "Bot status" })).getByText(
        "never",
      ),
    ).toBeInTheDocument();
  });

  it("shows the online state and the real counts without deltas", async () => {
    mocks.getOverviewData.mockResolvedValue(
      data("online", {
        summary: {
          totalEvents: 1234,
          last24h: 12,
          last7d: 99,
          activeAuthors7d: 7,
        },
        recent: [
          {
            id: "e1",
            occurredAt: new Date("2026-10-28T10:15:00.000Z"),
            channelId: "222222222222222222",
            authorId: "333333333333333333",
          },
        ],
      }),
    );
    await renderPage();

    expect(screen.getByText("Bot online")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Bot status" }),
    ).toHaveTextContent("30 s ago");
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Last 24 hours")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("Active authors")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    // No fake comparisons.
    expect(document.body.textContent ?? "").not.toMatch(
      /vs previous|[+-]\d+\.\d%/,
    );
    expect(
      screen.queryByText("The bot is installed but not reporting"),
    ).not.toBeInTheDocument();
  });

  it("lists recent activity with ids in monospace and no message content", async () => {
    mocks.getOverviewData.mockResolvedValue(
      data("online", {
        summary: { totalEvents: 1, last24h: 1, last7d: 1, activeAuthors7d: 1 },
        recent: [
          {
            id: "e1",
            occurredAt: new Date("2026-10-28T10:15:00.000Z"),
            channelId: "222222222222222222",
            authorId: "333333333333333333",
          },
        ],
      }),
    );
    await renderPage();

    const recent = screen.getByRole("region", { name: "Recent activity" });
    const row = within(recent).getByRole("listitem");
    expect(row).toHaveTextContent("Oct 28, 10:15 UTC");
    const channel = within(row).getByText("222222222222222222");
    const author = within(row).getByText("333333333333333333");
    expect(channel).toHaveClass("font-mono");
    expect(channel).toHaveAttribute("title", "222222222222222222");
    expect(author).toHaveClass("font-mono");
    expect(row.textContent).not.toMatch(/content|text:|attachment/i);
  });

  it("shows the channel name when it is known, with the id as a tooltip", async () => {
    mocks.getOverviewData.mockResolvedValue(
      data("online", {
        recent: [
          {
            id: "e1",
            occurredAt: new Date("2026-10-28T10:15:00.000Z"),
            channelId: "222222222222222222",
            channelName: "general",
            authorId: "333333333333333333",
          },
        ],
      }),
    );
    await renderPage();
    const row = within(
      screen.getByRole("region", { name: "Recent activity" }),
    ).getByRole("listitem");
    expect(within(row).getByText("#general")).toHaveAttribute(
      "title",
      "222222222222222222",
    );
    expect(
      within(row).queryByText("222222222222222222"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state before the first message", async () => {
    mocks.getOverviewData.mockResolvedValue(data("online"));
    await renderPage();

    expect(screen.getByText("No messages recorded yet")).toBeInTheDocument();
    expect(
      screen.getByText("Send a message in a channel the bot can see."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4);
  });

  it("never renders demo data on the authenticated overview", async () => {
    for (const status of ["not_installed", "offline", "online"] as const) {
      mocks.getOverviewData.mockResolvedValue(data(status));
      document.body.innerHTML = "";
      await renderPage();
      expect(screen.queryByText(/Demo data/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("complementary", { name: /demo/i }),
      ).not.toBeInTheDocument();
      expect(document.body.textContent ?? "").not.toMatch(/sample data.*\d/i);
    }
  });

  it("renders the typed error state when the database fails, keeping the header", async () => {
    mocks.getOverviewData.mockResolvedValue({
      status: "error",
      community: community(),
    });
    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load this community's activity",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Pixel Guild" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try again/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByText("Messages recorded")).not.toBeInTheDocument();
  });

  it("renders the error state without a header when even the community failed to load", async () => {
    mocks.getOverviewData.mockResolvedValue({
      status: "error",
      community: null,
    });
    await renderPage();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
});
