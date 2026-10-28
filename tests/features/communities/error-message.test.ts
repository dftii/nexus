import { describe, expect, it } from "vitest";
import {
  formatSeconds,
  retrySeconds,
  selectErrorMessage,
} from "@/features/communities/error-message";

describe("retrySeconds", () => {
  it("rounds up and never shows zero", () => {
    expect(retrySeconds(2.1)).toBe(3);
    expect(retrySeconds(0)).toBe(1);
    expect(retrySeconds(0.01)).toBe(1);
  });

  it("falls back to one second for missing or invalid values", () => {
    expect(retrySeconds(undefined)).toBe(1);
    expect(retrySeconds(Number.NaN)).toBe(1);
    expect(retrySeconds(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("formatSeconds", () => {
  it("pluralises", () => {
    expect(formatSeconds(1)).toBe("1 second");
    expect(formatSeconds(30)).toBe("30 seconds");
  });
});

describe("selectErrorMessage", () => {
  it("makes a rate limit concrete", () => {
    expect(
      selectErrorMessage({
        status: "error",
        code: "rate_limited",
        message: "ignored",
        retryAfter: 12,
      }),
    ).toBe("Discord is asking us to slow down. Try again in about 12 seconds.");
  });

  it("passes other messages through", () => {
    expect(
      selectErrorMessage({
        status: "error",
        code: "forbidden",
        message: "No.",
      }),
    ).toBe("No.");
  });
});
