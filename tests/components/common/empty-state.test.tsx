// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/common/empty-state";
import { ComingSoon } from "@/components/common/coming-soon";
import { StatCard } from "@/components/common/stat-card";

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nothing here"
        description="Add something."
        action={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add something.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("works with only a title", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("shows value, sign and a text alternative for the direction", () => {
    render(
      <StatCard
        label="Total members"
        value="5,500"
        change={{
          direction: "down",
          text: "-2.0%",
          comparison: "vs previous 30 days",
        }}
      />,
    );
    expect(screen.getByText("Total members")).toBeInTheDocument();
    expect(screen.getByText("5,500")).toBeInTheDocument();
    expect(screen.getByText("-2.0%")).toBeInTheDocument();
    expect(screen.getByText("Down")).toBeInTheDocument();
    expect(screen.getByText("vs previous 30 days")).toBeInTheDocument();
  });
});

describe("ComingSoon", () => {
  it("states the section is not built and names the roadmap phase", () => {
    render(<ComingSoon href="/automations" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Automations is not available/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Planned for Phase 5/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Back to Overview/ }),
    ).toHaveAttribute("href", "/");
  });

  it("throws for a route that is not in the nav config", () => {
    expect(() => render(<ComingSoon href="/missing" />)).toThrow();
  });
});
