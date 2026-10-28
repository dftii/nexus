/** Up to two uppercase initials for an avatar fallback ("?" when unnamed). */
export function userInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = Array.from(parts[0] ?? "")[0];
  if (!first) return "?";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1]!)[0] : "";
  return (first + (last ?? "")).toUpperCase();
}
