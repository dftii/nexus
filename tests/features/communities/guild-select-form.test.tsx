// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SelectCommunityErrorCode,
  SelectCommunityState,
} from "@/features/communities/types";

const mocks = vi.hoisted(() => ({
  selectCommunityAction: vi.fn(),
  signInWithDiscordAction: vi.fn(),
}));

vi.mock("@/features/communities/actions", () => ({
  selectCommunityAction: mocks.selectCommunityAction,
}));
vi.mock("@/features/auth/actions", () => ({
  signInWithDiscordAction: mocks.signInWithDiscordAction,
}));

import { GuildSelectForm } from "@/features/communities/components/guild-select-form";

function errorState(
  code: SelectCommunityErrorCode,
  extra: Partial<Extract<SelectCommunityState, { status: "error" }>> = {},
): SelectCommunityState {
  return { status: "error", code, message: `message for ${code}`, ...extra };
}

function renderForm(alreadyInNexus = false) {
  render(
    <GuildSelectForm
      guildId="111"
      guildName="Pixel Guild"
      alreadyInNexus={alreadyInNexus}
    />,
  );
}

beforeEach(() => {
  mocks.selectCommunityAction.mockReset();
  mocks.signInWithDiscordAction.mockReset();
});

describe("GuildSelectForm", () => {
  it("says Connect for a new server and Select for one already in NEXUS", () => {
    renderForm(false);
    expect(
      screen.getByRole("button", { name: "Connect Pixel Guild" }),
    ).toBeInTheDocument();
    renderForm(true);
    expect(
      screen.getByRole("button", { name: "Select Pixel Guild" }),
    ).toBeInTheDocument();
  });

  it("disables the button and shows progress while the action runs", async () => {
    let finish!: (state: SelectCommunityState) => void;
    mocks.selectCommunityAction.mockImplementation(
      () => new Promise<SelectCommunityState>((resolve) => (finish = resolve)),
    );
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));
    const busy = screen.getByRole("button", { name: /Connecting/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");

    await act(async () => finish({ status: "idle" }));
    expect(screen.getByRole("button", { name: /Connect/ })).toBeEnabled();
  });

  it.each([
    "invalid",
    "forbidden",
    "unavailable",
    "db_error",
  ] as SelectCommunityErrorCode[])(
    "shows the server message for %s without extra actions",
    async (code) => {
      mocks.selectCommunityAction.mockResolvedValue(errorState(code));
      renderForm();
      await userEvent.click(screen.getByRole("button", { name: /Connect/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        `message for ${code}`,
      );
      expect(
        screen.queryByRole("button", { name: "Sign in again" }),
      ).not.toBeInTheDocument();
      // The button comes back so the user can retry.
      expect(screen.getByRole("button", { name: /Connect/ })).toBeEnabled();
    },
  );

  it("shows the wait in seconds for rate_limited", async () => {
    mocks.selectCommunityAction.mockResolvedValue(
      errorState("rate_limited", { retryAfter: 7.3 }),
    );
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Try again in about 8 seconds.",
    );
  });

  it("offers Sign in again for reauth_required, returning to /onboarding", async () => {
    mocks.selectCommunityAction.mockResolvedValue(
      errorState("reauth_required"),
    );
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "message for reauth_required",
    );
    const signIn = screen.getByRole("button", { name: "Sign in again" });
    await userEvent.click(signIn);
    expect(mocks.signInWithDiscordAction).toHaveBeenCalledTimes(1);
    const formData = mocks.signInWithDiscordAction.mock
      .calls[0]![0] as FormData;
    expect(formData.get("redirectTo")).toBe("/onboarding");
  });
});
