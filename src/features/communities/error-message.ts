import type { SelectCommunityState } from "./types";

/** Seconds to show for a Discord rate limit: whole, and never "0". */
export function retrySeconds(retryAfter: number | undefined): number {
  if (typeof retryAfter !== "number" || !Number.isFinite(retryAfter)) return 1;
  return Math.max(1, Math.ceil(retryAfter));
}

/** "1 second" / "5 seconds". */
export function formatSeconds(seconds: number): string {
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

/**
 * Text for an error state of the community selection form. The server action
 * supplies the base message; for a rate limit the wait is made concrete.
 */
export function selectErrorMessage(
  state: Extract<SelectCommunityState, { status: "error" }>,
): string {
  if (state.code === "rate_limited") {
    return `Discord is asking us to slow down. Try again in about ${formatSeconds(retrySeconds(state.retryAfter))}.`;
  }
  return state.message;
}
