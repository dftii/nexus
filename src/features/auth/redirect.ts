const DEFAULT_REDIRECT = "/";
const MAX_LENGTH = 200;

/**
 * Sanitise a post-login destination coming from the browser. Only same-site
 * absolute paths are allowed ("/x", never "//host", "/\\host" or a URL), and
 * the auth pages themselves are excluded to avoid loops.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_REDIRECT;
  if (value.length === 0 || value.length > MAX_LENGTH) return DEFAULT_REDIRECT;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_REDIRECT;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return DEFAULT_REDIRECT;
  }
  const path = value.split(/[?#]/, 1)[0] ?? "";
  if (path === "/login" || path.startsWith("/api/auth")) {
    return DEFAULT_REDIRECT;
  }
  return value;
}
