import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/nextauth", () => ({ auth: mocks.auth }));

import { getCurrentUser, requireUser } from "@/server/auth/user";

function configure() {
  vi.stubEnv("AUTH_SECRET", "a-secret-with-enough-length-0123456789");
  vi.stubEnv("AUTH_DISCORD_ID", "client-id");
  vi.stubEnv("AUTH_DISCORD_SECRET", "client-secret");
}

beforeEach(() => {
  vi.unstubAllEnvs();
  mocks.auth.mockReset();
  mocks.redirect.mockClear();
});

describe("requireUser", () => {
  it("redirects to /login when there is no session", async () => {
    configure();
    mocks.auth.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects when the session has no user id", async () => {
    configure();
    mocks.auth.mockResolvedValue({ user: { name: "x" }, expires: "z" });
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
    mocks.auth.mockResolvedValue({ user: { id: "" }, expires: "z" });
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to the configuration error when auth is not configured, without touching Auth.js", async () => {
    await expect(requireUser()).rejects.toThrow(
      "NEXT_REDIRECT:/login?error=Configuration",
    );
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("returns only the public user fields", async () => {
    configure();
    mocks.auth.mockResolvedValue({
      user: { id: "user_1", name: "Alex", image: null, email: "leak@x.y" },
      expires: "2026-11-27T00:00:00.000Z",
    });
    expect(await requireUser()).toEqual({
      id: "user_1",
      name: "Alex",
      image: null,
    });
  });
});

describe("getCurrentUser", () => {
  it("returns null (never throws) when auth is not configured", async () => {
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("returns null without a session", async () => {
    configure();
    mocks.auth.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });
});
