import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

// logo_url is null for a shop that never uploaded one, so the monogram
// fallback (same helper the admin sidebar/receipt use) is the normal case,
// not an error state — a storefront should never render a broken image box.
const SIZES = {
  sm: "size-9 rounded-lg text-xs",
  lg: "size-20 rounded-2xl text-xl sm:size-24 sm:text-2xl",
} as const;

interface ShopLogoProps {
  name: string;
  logoUrl: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function ShopLogo({ name, logoUrl, size = "sm", className }: ShopLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-muted font-semibold text-muted-foreground ring-1 ring-border",
        SIZES[size],
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo_url is already a full URL from the backend, next/image doesn't apply
        <img src={logoUrl} alt={`${name} logo`} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
