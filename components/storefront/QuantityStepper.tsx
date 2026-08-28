"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  // Called only with a valid, clamped integer.
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
}

const SIZES = {
  sm: { button: "size-9", field: "w-9", icon: "size-3.5", rounded: "rounded-lg" },
  md: { button: "size-12", field: "w-12", icon: "size-4", rounded: "rounded-xl" },
} as const;

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = "md",
  "aria-label": ariaLabel = "Quantity",
}: QuantityStepperProps) {
  const s = SIZES[size];

  // Local text state so the field can sit empty / half-typed without
  // snapping. Re-syncs whenever the committed value changes from outside
  // (the buttons, a cart merge) — render-phase adjustment, not an effect.
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  function clamp(n: number): number {
    const floored = Math.floor(Number.isFinite(n) ? n : min);
    const lowered = Math.max(min, floored);
    return max !== undefined ? Math.min(max, lowered) : lowered;
  }

  function commit(n: number) {
    const next = clamp(n);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  const buttonClass = cn(
    "grid shrink-0 place-items-center text-storefront-ink transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent",
    s.button,
  );

  return (
    <div
      className={cn(
        // w-fit: as a flex/grid child its `inline-flex` gets blockified, so
        // without an explicit width the parent's align-items: stretch blows
        // it out to full width.
        "inline-flex w-fit overflow-hidden border border-black/10 bg-white shadow-sm transition-[color,box-shadow,border-color]",
        s.rounded,
        "focus-within:border-storefront-ink/40 focus-within:ring-2 focus-within:ring-storefront-ink/10",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => commit(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={buttonClass}
      >
        <Minus className={s.icon} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => commit(draft === "" ? min : Number(draft))}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={cn(
          "bg-transparent text-center text-sm font-medium tabular-nums text-storefront-ink outline-none",
          s.field,
        )}
      />

      <button
        type="button"
        onClick={() => commit(value + 1)}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label="Increase quantity"
        className={buttonClass}
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}
