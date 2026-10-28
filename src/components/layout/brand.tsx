import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** NEXUS monogram: two stems joined by a diagonal. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-6 text-primary", className)}
    >
      <path d="M5 19V5l14 14V5" />
    </svg>
  );
}

/** Wordmark that links to the Overview page. */
export function Brand({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name}, go to Overview`}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md text-lg font-semibold tracking-tight",
        className,
      )}
    >
      <BrandMark />
      <span>{siteConfig.name}</span>
    </Link>
  );
}
