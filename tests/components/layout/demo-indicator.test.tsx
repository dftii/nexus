// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoIndicator } from "@/components/layout/demo-indicator";

const pathname = vi.hoisted(() => ({ current: "/demo" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  pathname.current = "/demo";
});

describe("DemoIndicator", () => {
  it("shows on the demo route", () => {
    render(<DemoIndicator />);
    expect(screen.getByText(/Demo/)).toBeInTheDocument();
    expect(
      screen.getByText(": no Discord server connected"),
    ).toBeInTheDocument();
  });

  it.each(["/", "/onboarding", "/settings", "/analytics", "/demonstration"])(
    "is absent on %s",
    (path) => {
      pathname.current = path;
      const { container } = render(<DemoIndicator />);
      expect(container).toBeEmptyDOMElement();
    },
  );
});
