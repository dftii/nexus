"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Submit button for the Discord sign-in forms. While the server action runs
 * (it ends in a redirect to Discord) it disables itself and says what is
 * happening, so a double click cannot start two authorizations.
 */
export function DiscordSubmitButton({
  children = "Continue with Discord",
  pendingLabel = "Redirecting to Discord...",
  disabled = false,
  size = "default",
  variant = "default",
  className,
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  disabled?: boolean;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
