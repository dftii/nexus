"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const AUTO_REFRESH_INTERVAL_MS = 30_000;

/**
 * Re-renders the server page (`router.refresh()`) every 30 s so bot status and
 * metrics stay current without a manual reload. It pauses while the tab is
 * hidden and refreshes once as soon as the tab is visible again. It renders
 * nothing, so there is no animation to reduce for `prefers-reduced-motion`.
 */
export function AutoRefresh({
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => router.refresh(), intervalMs);
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, intervalMs]);

  return null;
}
