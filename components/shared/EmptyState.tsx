import type { LucideIcon } from "lucide-react";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// Two variants because empty space appears in two different kinds of
// container, and the same padding can't serve both:
//   "panel" — the empty state IS the surface (a list screen with no rows).
//     It gets the dashed border and the vertical air a full page needs so
//     the screen doesn't read as broken/still-loading.
//   "inline" — it sits INSIDE a surface that already has a border
//     (TableCard, Card, the notifications popover). Drawing a second
//     border there would box-in-a-box, so this one is borderless and
//     tighter.
type EmptyStateVariant = "panel" | "inline";

interface EmptyStateProps {
  // The whole point of the icon is recognition-at-a-glance, so pick one
  // that names the missing thing (Package for products, Receipt for
  // orders, SearchX for "your filters matched nothing").
  icon?: LucideIcon;
  title: string;
  // Optional second line — say what to do next, not just what's absent.
  description?: string;
  // A single primary CTA. A screen should never offer this AND a header
  // button for the same action; see the products list for how that's
  // handled (the header action is dropped while the empty state owns it).
  action?: React.ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "panel",
  className,
}: EmptyStateProps) {
  const isPanel = variant === "panel";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isPanel
          ? "gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-14"
          : "gap-2 px-4 py-8",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            isPanel ? "mb-1 size-12" : "size-9",
          )}
        >
          <Icon className={isPanel ? "size-6" : "size-4.5"} strokeWidth={1.75} />
        </div>
      )}

      <p className={isPanel ? typography.sectionHeading : "text-sm font-medium"}>{title}</p>

      {description && (
        <p className={cn(typography.muted, "max-w-sm text-balance")}>{description}</p>
      )}

      {action && <div className={cn("flex items-center gap-2", isPanel ? "mt-3" : "mt-2")}>{action}</div>}
    </div>
  );
}
