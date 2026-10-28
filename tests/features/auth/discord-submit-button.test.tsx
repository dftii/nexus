// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DiscordSubmitButton } from "@/features/auth/components/discord-submit-button";

function Form({
  action,
  disabled,
}: {
  action: () => Promise<void>;
  disabled?: boolean;
}) {
  return (
    <form action={action}>
      <DiscordSubmitButton disabled={disabled} />
    </form>
  );
}

describe("DiscordSubmitButton", () => {
  it("is disabled and says so while the form action is pending", async () => {
    let finish!: () => void;
    const action = () => new Promise<void>((resolve) => (finish = resolve));
    render(<Form action={action} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Continue with Discord" }),
    );
    const busy = screen.getByRole("button", { name: /Redirecting to Discord/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");

    await act(async () => finish());
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeEnabled();
  });

  it("stays disabled when asked to (sign-in not configured)", () => {
    render(<Form action={async () => {}} disabled />);
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeDisabled();
  });
});
