"use client";

import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type InvoiceQueueView = "review" | "awaiting";

const TABS: { value: InvoiceQueueView; label: string; hint: string }[] = [
  { value: "review", label: "To review", hint: "Transfers with a screenshot to rule on" },
  { value: "awaiting", label: "Awaiting transfer", hint: "Shops that asked how to pay and sent nothing" },
];

export function InvoiceQueueTabs({
  value,
  onChange,
  counts,
}: {
  value: InvoiceQueueView;
  onChange: (view: InvoiceQueueView) => void;
  counts: Partial<Record<InvoiceQueueView, number>>;
}) {
  const active = TABS.find((tab) => tab.value === value);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="tablist"
        aria-label="Bank transfer views"
        className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border bg-card p-1"
      >
        {TABS.map((tab) => {
          const isActive = tab.value === value;
          const count = counts[tab.value];

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums",
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active && <p className={typography.muted}>{active.hint}</p>}
    </div>
  );
}
