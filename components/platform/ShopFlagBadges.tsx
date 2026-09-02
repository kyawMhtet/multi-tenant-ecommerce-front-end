import { Badge } from "@/components/ui/badge";
import { shopFlags } from "@/lib/platform-shops";
import type { PlatformShop } from "@/lib/types";
import { shopFlagClassName, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * The states a shop is in that aren't its plan — suspended, read-only, in
 * grace, trialling, deactivated.
 *
 * Renders nothing for a plainly active shop, so a column of these reads as
 * "the rows that need attention" rather than a wall of pills. shopFlags()
 * decides what appears and in what order; this only draws it.
 *
 * `title` carries each flag's one-line explanation, because the two-word label
 * is not enough to act on: "Suspended" and "Read-only" look equally bad and
 * have completely different remedies — one is undone by us, the other by the
 * shop paying.
 */
export function ShopFlagBadges({
  shop,
  className,
}: {
  shop: PlatformShop;
  className?: string;
}) {
  const flags = shopFlags(shop);
  if (flags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {flags.map((flag) => (
        <Badge
          key={flag.tone}
          variant="outline"
          title={flag.detail}
          className={cn(statusPill, shopFlagClassName[flag.tone])}
        >
          {flag.label}
        </Badge>
      ))}
    </div>
  );
}
