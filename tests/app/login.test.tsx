// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/features/auth/actions", () => ({
  signInWithDiscordAction: vi.fn(),
}));

import LoginPage from "@/app/login/page";

function configure() {
  vi.stubEnv("AUTH_SECRET", "a-secret-with-enough-length-0123456789");
  vi.stubEnv("AUTH_DISCORD_ID", "client-id");
  vi.stubEnv("AUTH_DISCORD_SECRET", "client-secret");
}

async function renderLogin(params: Record<string, string> = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  vi.unstubAllEnvs();
  mocks.getCurrentUser.mockReset().mockResolvedValue(null);
  mocks.redirect.mockClear();
});

describe("/login", () => {
  it("offers Discord sign-in, explains the scopes and links to the demo", async () => {
    configure();
    await renderLogin();
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeEnabled();
    expect(screen.getByText("identify")).toBeInTheDocument();
    expect(screen.getByText("guilds")).toBeInTheDocument();
    expect(screen.getByText(/never posts on your behalf/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore the demo" }),
    ).toHaveAttribute("href", "/demo");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("maps AccessDenied to a cancelled message", async () => {
    configure();
    await renderLogin({ error: "AccessDenied" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You cancelled the Discord authorization",
    );
  });

  it("maps unknown errors to a generic retry message", async () => {
    configure();
    await renderLogin({ error: "OAuthCallbackError" });
    expect(screen.getByRole("alert")).toHaveTextContent(/try again/i);
  });

  it("says sign-in is not configured and disables the button without auth variables", async () => {
    await renderLogin();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign-in isn't configured on this server.",
    );
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeDisabled();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("redirects a signed-in user to /", async () => {
    configure();
    mocks.getCurrentUser.mockResolvedValue({
      id: "u",
      name: null,
      image: null,
    });
    await expect(renderLogin()).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it("only forwards a safe post-login path", async () => {
    configure();
    await renderLogin({ callbackUrl: "https://evil.example" });
    const hidden = document.querySelector<HTMLInputElement>(
      "input[name=redirectTo]",
    );
    expect(hidden?.value).toBe("/");
  });
});
