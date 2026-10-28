// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getActiveCommunity: vi.fn(),
  getEligibleGuilds: vi.fn(),
  selectCommunityAction: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/server/communities", () => ({
  getActiveCommunity: mocks.getActiveCommunity,
}));
vi.mock("@/server/discord/guilds", () => ({
  getEligibleGuilds: mocks.getEligibleGuilds,
}));
vi.mock("@/features/communities/actions", () => ({
  selectCommunityAction: mocks.selectCommunityAction,
}));
vi.mock("@/features/auth/actions", () => ({
  signInWithDiscordAction: vi.fn(),
}));

import OnboardingPage from "@/app/(app)/(protected)/onboarding/page";

function guild(overrides: Record<string, unknown> = {}) {
  return {
    id: "111",
    name: "Pixel Guild",
    iconUrl: null,
    reason: "owner",
    inNexus: false,
    communityId: null,
    botConnected: false,
    alreadySelected: false,
    ...overrides,
  };
}

async function renderPage() {
  render(await OnboardingPage());
}

/** The rows of the server list (the intro has its own bullet list). */
function serverItems() {
  return within(
    screen.getByRole("region", { name: /Your servers/ }),
  ).getAllByRole("listitem");
}

beforeEach(() => {
  mocks.requireUser
    .mockReset()
    .mockResolvedValue({ id: "user_1", name: "Ada", image: null });
  mocks.getActiveCommunity.mockReset().mockResolvedValue(null);
  mocks.getEligibleGuilds.mockReset();
  mocks.selectCommunityAction.mockReset();
});

describe("/onboarding", () => {
  it("requires a session before reading anything", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mocks.getEligibleGuilds).not.toHaveBeenCalled();
  });

  it("explains what connecting means", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({ status: "ok", guilds: [] });
    await renderPage();
    expect(
      screen.getByRole("heading", { name: "Connect a Discord server" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/only reads which servers/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 3/)).toBeInTheDocument();
  });

  it("lists eligible servers with reason and connection badges", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({
      status: "ok",
      guilds: [
        guild(),
        guild({
          id: "222",
          name: "Admin Hall",
          reason: "administrator",
          inNexus: true,
          communityId: "com_2",
          alreadySelected: true,
        }),
        guild({
          id: "333",
          name: "Mod Den",
          reason: "manage_server",
          inNexus: true,
          communityId: "com_3",
          botConnected: true,
          alreadySelected: true,
        }),
      ],
    });
    await renderPage();

    const items = serverItems();
    expect(items).toHaveLength(3);

    const [pixel, hall, den] = items as [HTMLElement, HTMLElement, HTMLElement];
    expect(
      within(pixel).getByText("Pixel Guild", { selector: "p" }),
    ).toBeInTheDocument();
    expect(within(pixel).getByText("Owner")).toBeInTheDocument();
    expect(within(pixel).getByText("Not in NEXUS yet")).toBeInTheDocument();
    expect(
      within(pixel).getByRole("button", { name: /Connect/ }),
    ).toBeEnabled();

    expect(within(hall).getByText("Administrator")).toBeInTheDocument();
    expect(
      within(hall).getByText("In NEXUS, bot not connected"),
    ).toBeInTheDocument();
    expect(within(hall).getByRole("button", { name: /Select/ })).toBeEnabled();

    expect(within(den).getByText("Manage Server")).toBeInTheDocument();
    expect(within(den).getByText("Bot connected")).toBeInTheDocument();
    expect(screen.queryByText("Selected")).not.toBeInTheDocument();
  });

  it("marks the active community as Selected instead of offering a button", async () => {
    mocks.getActiveCommunity.mockResolvedValue({ id: "com_2" });
    mocks.getEligibleGuilds.mockResolvedValue({
      status: "ok",
      guilds: [
        guild(),
        guild({
          id: "222",
          name: "Admin Hall",
          inNexus: true,
          communityId: "com_2",
          alreadySelected: true,
        }),
      ],
    });
    await renderPage();

    const [pixel, hall] = serverItems() as [HTMLElement, HTMLElement];
    expect(within(hall).getByText("Selected")).toBeInTheDocument();
    expect(
      within(hall).queryByRole("button", { name: /Select|Connect/ }),
    ).not.toBeInTheDocument();
    expect(
      within(hall).getByRole("link", { name: /Open overview/ }),
    ).toHaveAttribute("href", "/");
    expect(within(pixel).queryByText("Selected")).not.toBeInTheDocument();
  });

  it("shows initials when a server has no icon", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({
      status: "ok",
      guilds: [guild({ name: "Pixel Guild" })],
    });
    await renderPage();
    expect(screen.getByText("PG")).toBeInTheDocument();
  });

  it("explains the permission requirement when there are no eligible servers", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({ status: "ok", guilds: [] });
    await renderPage();
    expect(screen.getByText("No servers you can manage")).toBeInTheDocument();
    expect(screen.getByText(/Ask a server admin/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Explore the demo/ }),
    ).toHaveAttribute("href", "/demo");
    const help = screen.getByRole("link", { name: /How Discord permissions/ });
    expect(help).toHaveAttribute(
      "href",
      expect.stringContaining("discord.com"),
    );
    expect(help).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("offers to reconnect Discord when the authorization is gone", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({ status: "reauth_required" });
    await renderPage();
    expect(
      screen.getByText("Reconnect your Discord account"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reconnect Discord" }),
    ).toBeEnabled();
    expect(
      document.querySelector<HTMLInputElement>("input[name=redirectTo]")?.value,
    ).toBe("/onboarding");
  });

  it("shows the wait in seconds when Discord rate limits", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({
      status: "rate_limited",
      retryAfter: 4.2,
    });
    await renderPage();
    expect(screen.getByText(/about 5 seconds/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Try again/ })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });

  it("uses the singular for a one second wait", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({
      status: "rate_limited",
      retryAfter: 0.2,
    });
    await renderPage();
    expect(screen.getByText(/about 1 second\./)).toBeInTheDocument();
  });

  it("offers a reload when Discord is unavailable", async () => {
    mocks.getEligibleGuilds.mockResolvedValue({ status: "unavailable" });
    await renderPage();
    expect(screen.getByText("We couldn't reach Discord")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Reload the list/ }),
    ).toHaveAttribute("href", "/onboarding");
  });

  it("submits the guild id through the select action", async () => {
    mocks.selectCommunityAction.mockResolvedValue({ status: "idle" });
    mocks.getEligibleGuilds.mockResolvedValue({
      status: "ok",
      guilds: [guild()],
    });
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));
    expect(mocks.selectCommunityAction).toHaveBeenCalledTimes(1);
    const formData = mocks.selectCommunityAction.mock.calls[0]![1] as FormData;
    expect(formData.get("guildId")).toBe("111");
  });
});
