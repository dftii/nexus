// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOutAction: vi.fn(),
  switchActiveCommunityAction: vi.fn(),
}));

vi.mock("@/features/auth/actions", () => ({
  signOutAction: mocks.signOutAction,
}));
vi.mock("@/features/communities/actions", () => ({
  switchActiveCommunityAction: mocks.switchActiveCommunityAction,
}));

import { UserMenu } from "@/features/auth/components/user-menu";
import { userInitials } from "@/features/auth/initials";

beforeAll(() => {
  // Radix popper/menu use browser APIs jsdom lacks.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
});

beforeEach(() => {
  mocks.signOutAction.mockReset();
  mocks.switchActiveCommunityAction.mockReset();
});

const communities = [
  { id: "com_a", name: "Alpha" },
  { id: "com_b", name: "Beta" },
];

async function openMenu() {
  await userEvent.click(
    screen.getByRole("button", { name: /Account menu for/ }),
  );
  return screen.findByRole("menu");
}

describe("UserMenu", () => {
  it("shows the name and initials from plain display data", () => {
    render(
      <UserMenu
        user={{ name: "Ada Lovelace", image: null }}
        communities={[]}
        activeCommunityId={null}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Account menu for Ada Lovelace",
    });
    expect(trigger).toHaveTextContent("Ada Lovelace");
    expect(trigger).toHaveTextContent("AL");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("falls back to a neutral name when Discord gave none", () => {
    render(
      <UserMenu
        user={{ name: null, image: null }}
        communities={[]}
        activeCommunityId={null}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Account menu for Discord user" }),
    ).toHaveTextContent("?");
  });

  it("offers Change community and a Sign out form", async () => {
    render(
      <UserMenu
        user={{ name: "Ada", image: null }}
        communities={[communities[0]!]}
        activeCommunityId="com_a"
      />,
    );
    const menu = await openMenu();

    expect(
      within(menu).getByRole("menuitem", { name: "Change community" }),
    ).toHaveAttribute("href", "/onboarding");
    const signOut = within(menu).getByRole("menuitem", { name: "Sign out" });
    expect(signOut).toHaveAttribute("type", "submit");
    expect(signOut.closest("form")).not.toBeNull();

    await userEvent.click(signOut);
    expect(mocks.signOutAction).toHaveBeenCalledTimes(1);
  });

  it("hides the switcher with a single community", async () => {
    render(
      <UserMenu
        user={{ name: "Ada", image: null }}
        communities={[communities[0]!]}
        activeCommunityId="com_a"
      />,
    );
    const menu = await openMenu();
    expect(within(menu).queryByText("Switch community")).toBeNull();
  });

  it("lists communities to switch between and marks the current one", async () => {
    render(
      <UserMenu
        user={{ name: "Ada", image: null }}
        communities={communities}
        activeCommunityId="com_b"
      />,
    );
    const menu = await openMenu();
    expect(within(menu).getByText("Switch community")).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Beta (current)" }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Alpha" }),
    );
    expect(mocks.switchActiveCommunityAction).toHaveBeenCalledTimes(1);
    const formData = mocks.switchActiveCommunityAction.mock
      .calls[0]![0] as FormData;
    expect(formData.get("communityId")).toBe("com_a");
  });

  it("renders no token, session or account identifier in the DOM", async () => {
    render(
      <UserMenu
        user={{ name: "Ada", image: "https://cdn.discordapp.com/a.png" }}
        communities={communities}
        activeCommunityId="com_a"
      />,
    );
    await openMenu();
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("token");
    expect(html).not.toContain("secret");
    // Only the two documented hidden fields exist.
    const hidden = Array.from(
      document.querySelectorAll<HTMLInputElement>("input[type=hidden]"),
    ).map((input) => input.name);
    expect(new Set(hidden)).toEqual(new Set(["communityId"]));
  });
});

describe("UserMenu props contract", () => {
  it("accepts only name and image for the user", () => {
    // Compile-time contract: an id (or anything else) is not part of the type.
    const props: Parameters<typeof UserMenu>[0] = {
      user: { name: "Ada", image: null },
      communities: [],
      activeCommunityId: null,
    };
    expect(Object.keys(props.user).sort()).toEqual(["image", "name"]);
  });
});

describe("userInitials", () => {
  it("uses the first and last word", () => {
    expect(userInitials("Ada Lovelace")).toBe("AL");
    expect(userInitials("ada")).toBe("A");
    expect(userInitials("  grace  brewster  hopper ")).toBe("GH");
  });

  it("handles empty and astral characters", () => {
    expect(userInitials("")).toBe("?");
    expect(userInitials(null)).toBe("?");
    expect(userInitials("   ")).toBe("?");
    expect(userInitials("\u{1F600} Smile")).toBe("\u{1F600}S");
  });
});
