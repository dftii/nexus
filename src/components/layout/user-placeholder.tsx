import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Placeholder for the signed-in user. There is no authentication yet (Discord
 * sign-in arrives in Phase 2), so this is deliberately static: not a button,
 * not a menu.
 */
export function UserPlaceholder() {
  return (
    <div
      className="flex items-center gap-2.5"
      role="group"
      aria-label="Guest, not signed in"
    >
      <Avatar className="size-8">
        <AvatarFallback aria-hidden="true">G</AvatarFallback>
      </Avatar>
      <div className="hidden text-sm leading-tight md:block">
        <p className="font-medium">Guest</p>
        <p className="text-xs text-muted-foreground">Not signed in</p>
      </div>
    </div>
  );
}
