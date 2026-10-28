/** Message shown on /login for an Auth.js `?error=` code. */
const MESSAGES: Record<string, string> = {
  AccessDenied: "You cancelled the Discord authorization. Nothing was changed.",
  Configuration: "Sign-in isn't configured on this server.",
};

const GENERIC =
  "We couldn't sign you in with Discord. Please try again in a moment.";

/**
 * Map an Auth.js error code (query string, so untrusted) to user-facing text.
 * Unknown codes get the generic message; the raw code is never echoed back.
 */
export function loginErrorMessage(
  code: string | string[] | undefined,
): string | null {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return null;
  return Object.hasOwn(MESSAGES, value) ? (MESSAGES[value] as string) : GENERIC;
}
