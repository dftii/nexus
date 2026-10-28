import { afterEach } from "vitest";

// jest-dom matchers (toBeInTheDocument, ...) and DOM cleanup only matter in
// jsdom test files; node-environment tests skip both.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}
