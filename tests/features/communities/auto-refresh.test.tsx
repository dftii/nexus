// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { AutoRefresh } from "@/features/communities/components/auto-refresh";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AutoRefresh", () => {
  it("renders nothing and refreshes every 30 seconds while visible", () => {
    const { container } = render(<AutoRefresh />);
    expect(container).toBeEmptyDOMElement();

    vi.advanceTimersByTime(29_999);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("pauses while the tab is hidden", () => {
    render(<AutoRefresh />);
    setHidden(true);
    vi.advanceTimersByTime(5 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not start when mounted in a hidden tab", () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    render(<AutoRefresh />);
    vi.advanceTimersByTime(5 * 60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes once when the tab becomes visible again, then resumes", () => {
    render(<AutoRefresh />);
    setHidden(true);
    setHidden(false);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("stops everything on unmount", () => {
    const { unmount } = render(<AutoRefresh />);
    unmount();
    vi.advanceTimersByTime(5 * 60_000);
    setHidden(false);
    expect(refresh).not.toHaveBeenCalled();
  });
});
