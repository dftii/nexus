// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listUserCommunities: vi.fn(),
  getActiveCommunity: vi.fn(),
  userMenu: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/communities", () => ({
  listUserCommunities: mocks.listUserCommunities,
  getActiveCommunity: mocks.getActiveCommunity,
}));
vi.mock("@/features/auth/components/user-menu", () => ({
  UserMenu: (props: unknown) => {
    mocks.userMenu(props);
    return <div data-testid="user-menu" />;
  },
}));

import { HeaderAccount } from "@/features/auth/components/header-account";

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue(null);
  mocks.listUserCommunities.mockReset().mockResolvedValue([]);
  mocks.getActiveCommunity.mockReset().mockResolvedValue(null);
  mocks.userMenu.mockReset();
});

describe("HeaderAccount", () => {
  it("shows a Sign in link to visitors (the public demo)", async () => {
    render(await HeaderAccount());
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByTestId("user-menu")).not.toBeInTheDocument();
    expect(mocks.listUserCommunities).not.toHaveBeenCalled();
  });

  it("gives the client menu only plain display data", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "user_1",
      name: "Ada",
      image: "https://cdn.discordapp.com/a.png",
    });
    mocks.listUserCommunities.mockResolvedValue([
      {
        id: "com_a",
        discordGuildId: "111",
        name: "Alpha",
        iconUrl: null,
        role: "OWNER",
        botConnected: false,
      },
    ]);
    mocks.getActiveCommunity.mockResolvedValue({ id: "com_a" });
    render(await HeaderAccount());

    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(mocks.userMenu).toHaveBeenCalledWith({
      user: { name: "Ada", image: "https://cdn.discordapp.com/a.png" },
      communities: [{ id: "com_a", name: "Alpha" }],
      activeCommunityId: "com_a",
    });
    // Nothing that is not display data reaches the client component.
    expect(JSON.stringify(mocks.userMenu.mock.calls[0])).not.toMatch(
      /user_1|discordGuildId|role|token/i,
    );
  });

  it("degrades to the signed-out view when the session store fails", async () => {
    mocks.getCurrentUser.mockRejectedValue(new Error("database down"));
    render(await HeaderAccount());
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});
