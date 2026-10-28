/** Error codes the community selection action can return. */
export type SelectCommunityErrorCode =
  | "invalid"
  | "forbidden"
  | "reauth_required"
  | "rate_limited"
  | "unavailable"
  | "db_error";

/**
 * State for `useActionState(selectCommunityAction, initialSelectCommunityState)`.
 * On success the action redirects, so "ok" is never rendered.
 */
export type SelectCommunityState =
  | { status: "idle" }
  | {
      status: "error";
      code: SelectCommunityErrorCode;
      /** User-facing explanation. */
      message: string;
      /** Seconds to wait, only for `rate_limited`. */
      retryAfter?: number;
    };

export const initialSelectCommunityState: SelectCommunityState = {
  status: "idle",
};
