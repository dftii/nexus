// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getActiveCommunity: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/communities", () => ({
  getActiveCommunity: mocks.getActiveCommunity,
}));

import OverviewPage from "@/app/(app)/(protected)/page";

const user = { id: "user_1", name: "Ada", image: null };

function community(overrides: Record<string, unknown> = {}) {
  return {
    id: "com_1",
    discordGuildId: "111",
    name: "Pixel Guild",
    iconUrl: null,
    role: "OWNER",
    botConnected: false,
    ...overrides,
  };
}

async function renderPage() {
  render(await OverviewPage());
}

beforeEach(() => {
  mocks.requireUser.mockReset().mockResolvedValue(user);
  mocks.getActiveCommunity.mockReset().mockResolvedValue(null);
  mocks.redirect.mockClear();
});

describe("/ (Overview)", () => {
  it("lets requireUser redirect an unauthenticated visitor and reads nothing else", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mocks.getActiveCommunity).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding when the user has no community", async () => {
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
    expect(mocks.getActiveCommunity).toHaveBeenCalledWith("user_1");
  });

  it("shows an honest not-connected state for a community without the bot", async () => {
    mocks.getActiveCommunity.mockResolvedValue(community());
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 2, name: "Pixel Guild" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getAllByText(/Bot not connected/).length).toBeGreaterThan(0);
    expect(screen.getByText(/NEXUS does not make any up/)).toBeInTheDocument();

    const invite = screen.getByRole("button", { name: /Invite bot/ });
    expect(invite).toBeDisabled();
    expect(invite).toHaveTextContent("Phase 3");

    expect(
      screen.getByRole("link", { name: /See what it will look like/ }),
    ).toHaveAttribute("href", "/demo");
    expect(
      screen.getByRole("link", { name: /Change community/ }),
    ).toHaveAttribute("href", "/onboarding");
  });

  it("never renders demo data or demo numbers for a real community", async () => {
    mocks.getActiveCommunity.mockResolvedValue(community());
    await renderPage();

    expect(screen.queryByText(/Demo data/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: /demo/i }),
    ).not.toBeInTheDocument();
    // No metric cards, charts or figures of any kind.
    expect(document.body.textContent ?? "").not.toMatch(/\d{2,}/);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows a neutral Phase 4 placeholder when the bot is connected", async () => {
    mocks.getActiveCommunity.mockResolvedValue(
      community({ botConnected: true, role: "ADMIN" }),
    );
    await renderPage();

    expect(screen.getByText("Live analytics are coming")).toBeInTheDocument();
    expect(screen.getByText(/Phase 4/)).toBeInTheDocument();
    expect(screen.getByText("Bot connected")).toBeInTheDocument();
    expect(screen.queryByText(/Demo data/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Invite bot/ }),
    ).not.toBeInTheDocument();
  });
});
