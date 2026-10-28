/**
 * Guild allowlist. The bot processes ONLY guilds listed here (fail closed): an
 * empty allowlist disables all community processing.
 */

const SNOWFLAKE = /^\d{17,20}$/;

export function isSnowflake(value: string): boolean {
  return SNOWFLAKE.test(value);
}

export interface ParsedAllowlist {
  /** Trimmed, deduplicated, valid server IDs in first-seen order. */
  ids: string[];
  /** 1-based positions (in the comma-separated list) of invalid entries. */
  invalidPositions: number[];
}

/**
 * Parse a comma-separated list of server IDs. Empty segments (a trailing
 * comma, `a,,b`) are ignored but still count for positions, so the reported
 * position matches what the operator sees in the variable.
 */
export function parseAllowlist(raw: string | undefined): ParsedAllowlist {
  const ids: string[] = [];
  const invalidPositions: number[] = [];
  if (!raw) return { ids, invalidPositions };
  raw.split(",").forEach((segment, index) => {
    const entry = segment.trim();
    if (entry === "") return;
    if (!isSnowflake(entry)) {
      invalidPositions.push(index + 1);
      return;
    }
    if (!ids.includes(entry)) ids.push(entry);
  });
  return { ids, invalidPositions };
}

export interface Allowlist {
  readonly ids: readonly string[];
  /** False when empty: no community may be processed. */
  readonly enabled: boolean;
  has(guildId: string | null | undefined): boolean;
}

export function createAllowlist(ids: readonly string[]): Allowlist {
  const set = new Set(ids);
  return {
    ids: [...set],
    enabled: set.size > 0,
    has: (guildId) => (guildId ? set.has(guildId) : false),
  };
}
