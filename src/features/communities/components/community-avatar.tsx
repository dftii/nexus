import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userInitials } from "@/features/auth/initials";
import { cn } from "@/lib/utils";

/** Server icon, or the server's initials when it has none (or it fails to load). */
export function CommunityAvatar({
  name,
  iconUrl,
  className,
}: {
  name: string;
  iconUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-10 rounded-lg after:rounded-lg", className)}>
      {iconUrl ? (
        <AvatarImage src={iconUrl} alt="" className="rounded-lg" />
      ) : null}
      <AvatarFallback aria-hidden="true" className="rounded-lg">
        {userInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
