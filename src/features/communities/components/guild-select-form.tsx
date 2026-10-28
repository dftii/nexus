"use client";

import { useActionState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscordSubmitButton } from "@/features/auth/components/discord-submit-button";
import { signInWithDiscordAction } from "@/features/auth/actions";
import { selectCommunityAction } from "../actions";
import { selectErrorMessage } from "../error-message";
import { initialSelectCommunityState } from "../types";

/**
 * Connect / select button for one guild. Runs `selectCommunityAction`, which
 * re-checks the permission with Discord on the server and redirects to `/` on
 * success; on failure it shows the reason inline, next to the button.
 * `guildId` is only a hint for the server, never an authorization.
 */
export function GuildSelectForm({
  guildId,
  guildName,
  alreadyInNexus,
}: {
  guildId: string;
  guildName: string;
  /** The user already has this community: say "Select" instead of "Connect". */
  alreadyInNexus: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    selectCommunityAction,
    initialSelectCommunityState,
  );

  const label = pending
    ? alreadyInNexus
      ? "Selecting"
      : "Connecting"
    : alreadyInNexus
      ? "Select"
      : "Connect";

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form action={formAction}>
        <input type="hidden" name="guildId" value={guildId} />
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          aria-busy={pending}
          aria-label={`${label} ${guildName}`}
          className="min-w-28"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="animate-spin" />
              {alreadyInNexus ? "Selecting..." : "Connecting..."}
            </>
          ) : alreadyInNexus ? (
            "Select"
          ) : (
            "Connect"
          )}
        </Button>
      </form>

      {state.status === "error" ? (
        <div className="flex max-w-xs flex-col items-start gap-2 sm:items-end">
          <p
            role="alert"
            className="flex items-start gap-1.5 text-xs text-destructive sm:text-right"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0"
            />
            <span>{selectErrorMessage(state)}</span>
          </p>
          {state.code === "reauth_required" ? (
            <form action={signInWithDiscordAction}>
              <input type="hidden" name="redirectTo" value="/onboarding" />
              <DiscordSubmitButton
                size="sm"
                variant="outline"
                pendingLabel="Redirecting..."
              >
                Sign in again
              </DiscordSubmitButton>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
