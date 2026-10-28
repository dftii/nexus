// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { navigation } from "@/config/navigation";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

describe("SidebarNav", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("renders a link for every nav item inside a labelled landmark", () => {
    render(<SidebarNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("link")).toHaveLength(navigation.length);
  });

  it("shows a Soon badge on unavailable items only", () => {
    render(<SidebarNav />);
    const soon = navigation.filter((item) => item.status === "soon");
    expect(screen.getAllByText("Soon")).toHaveLength(soon.length);

    const overview = screen.getByRole("link", { name: "Overview" });
    expect(within(overview).queryByText("Soon")).not.toBeInTheDocument();
    const analytics = screen.getByRole("link", { name: /Analytics/ });
    expect(within(analytics).getByText("Soon")).toBeInTheDocument();
  });

  it("marks only the current page with aria-current", () => {
    pathname.current = "/analytics";
    render(<SidebarNav />);
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(/Analytics/);
  });

  it("marks Overview as current on /", () => {
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("calls onNavigate when a link is followed", async () => {
    const onNavigate = vi.fn();
    // jsdom cannot navigate; keep the click from logging a console error.
    document.addEventListener("click", (e) => e.preventDefault(), {
      once: true,
    });
    render(<SidebarNav onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole("link", { name: /Settings/ }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe("SidebarNav on the public demo", () => {
  beforeEach(() => {
    pathname.current = "/demo";
  });

  it("points Overview at /demo and highlights it", () => {
    render(<SidebarNav />);
    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview).toHaveAttribute("href", "/demo");
    expect(overview).toHaveAttribute("aria-current", "page");
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
  });

  it("keeps the other sections marked Soon", () => {
    render(<SidebarNav />);
    const soon = navigation.filter((item) => item.status === "soon");
    expect(screen.getAllByText("Soon")).toHaveLength(soon.length);
    expect(screen.getByRole("link", { name: /Analytics/ })).toHaveAttribute(
      "href",
      "/analytics",
    );
  });

  it("points Overview back at / outside the demo", () => {
    pathname.current = "/onboarding";
    render(<SidebarNav />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
