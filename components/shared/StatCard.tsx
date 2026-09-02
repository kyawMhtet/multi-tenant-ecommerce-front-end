import type { LucideIcon } from "lucide-react";
import { typography, surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// In shared/ rather than admin/: the platform console's shop detail counts
// products and orders with the same card. See FilterBar for the general rule.
type StatCardTone = "default" | "warning" | "success" | "info" | "violet" | "rose" | "muted";

// Tone now colours the glyph and lets the chip behind it derive its own
// wash from that same colour (bg-current/10), instead of the old
// bg-*-100/text-*-700 pair. Two reasons: those fixed 100-level washes are
// near-white and read as a bright block on a dark background, and pinning
// the chip to `current` means a tone is one value to change, not two to
// keep in sync.
//
// Only for distinguishing several cards shown together (Reports' six) — a
// card on its own stays on the app's one accent.
const toneClassName: Record<StatCardTone, string> = {
  default: "text-primary",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
  rose: "text-rose-600 dark:text-rose-400",
  // For a figure that is reported but not aimed at — money passing through
  // the shop rather than money it made. Colouring it like the others would
  // put it in the same league as profit and margin, which is precisely the
  // reading the backend split delivery fees out to prevent.
  muted: "text-muted-foreground",
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatCardTone;
  // A second, smaller line under the value — for a card whose headline
  // number needs a unit of its own ("across 3 orders"). Omitted on most
  // cards, where the label already says everything.
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, tone = "default", hint }: StatCardProps) {
  return (
    <div className={cn(surface.panel, "flex flex-col gap-4 p-5")}>
      {/* Label above the number, not beside it: a row of cards is read as
          a row of figures, and putting the caption on its own line lets the
          values sit on a shared baseline across the whole grid. */}
      <div className="flex items-start justify-between gap-3">
        <span className={cn(typography.microLabel, "pt-1")}>{label}</span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl bg-current/10",
            toneClassName[tone],
          )}
        >
          <Icon className="size-4.5" strokeWidth={2} />
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={typography.metric}>{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
