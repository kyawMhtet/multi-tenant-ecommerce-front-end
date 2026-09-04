"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { controls } from "@/lib/design-tokens";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// The backend's rule on preorder_lead_time_days: nullable integer, 1–365.
export const MIN_PREORDER_LEAD_TIME_DAYS = 1;
export const MAX_PREORDER_LEAD_TIME_DAYS = 365;

/**
 * Mirrors the backend rule. An empty value is VALID and means "we don't
 * know yet" — a real answer, not a missing one, so nothing here (or
 * anywhere else) fills in a number on the shop's behalf.
 */
export function validatePreorderLeadTime(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const days = Number(trimmed);
  if (!Number.isInteger(days)) return "Estimated wait must be a whole number of days.";
  if (days < MIN_PREORDER_LEAD_TIME_DAYS || days > MAX_PREORDER_LEAD_TIME_DAYS) {
    // Checked here rather than left to the 422 because the ceiling is the
    // non-obvious half: 400 days is a plausible thing to type for a long
    // import, and the server rejects it.
    return `Estimated wait must be between ${MIN_PREORDER_LEAD_TIME_DAYS} and ${MAX_PREORDER_LEAD_TIME_DAYS} days.`;
  }
  return undefined;
}

/** Form state ("" for unknown) → the wire value (null for unknown). */
export function preorderLeadTimeValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

// The backend's rule on preorder_deposit_percent: integer, 0-100.
export const MIN_PREORDER_DEPOSIT_PERCENT = 0;
export const MAX_PREORDER_DEPOSIT_PERCENT = 100;

// "Half prepaid" is the case this field was added for, so it shouldn't need
// typing. Full and none are the two extremes the old boolean could express.
const DEPOSIT_PRESETS = [
  { value: 0, label: "None" },
  { value: 50, label: "50%" },
  { value: 100, label: "Full" },
] as const;

/**
 * Mirrors the backend rule. Unlike the lead time, empty is NOT valid here —
 * "no deposit" is the number 0, and a blank field would be sent as one
 * anyway, so it has to be typed rather than left ambiguous.
 */
export function validatePreorderDepositPercent(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a deposit percentage, or 0 for none.";

  const percent = Number(trimmed);
  if (!Number.isInteger(percent)) return "Deposit must be a whole percentage.";
  if (percent < MIN_PREORDER_DEPOSIT_PERCENT || percent > MAX_PREORDER_DEPOSIT_PERCENT) {
    return `Deposit must be between ${MIN_PREORDER_DEPOSIT_PERCENT} and ${MAX_PREORDER_DEPOSIT_PERCENT}%.`;
  }
  return undefined;
}

/** Form state → the wire value. A blank field means no deposit. */
export function preorderDepositPercentValue(value: string): number {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : 0;
}

/**
 * What the shop is actually choosing, in the customer's words — so the
 * consequence of the number is on screen next to it rather than inferred.
 */
function depositHint(value: string): string {
  const percent = preorderDepositPercentValue(value);
  if (percent <= 0) {
    return "No deposit — customers can pay cash on delivery for this item.";
  }
  if (percent >= 100) {
    return "Paid in full before you order it. Cash on delivery is not offered.";
  }
  return `Customers pay ${percent}% up front and the rest on delivery. Cash on delivery is not offered.`;
}

interface PreorderFieldsProps {
  allowPreorder: boolean;
  // A string, like every other numeric input's state here — "" is what
  // "no estimate" looks like in a text field.
  leadTimeDays: string;
  // Also a string, for the same reason, but "" means 0 rather than unknown.
  depositPercent: string;
  onAllowPreorderChange: (value: boolean) => void;
  onLeadTimeChange: (value: string) => void;
  onDepositPercentChange: (value: string) => void;
  error?: string;
  depositError?: string;
}

/**
 * Selling a variant before its stock arrives. Shared by the three forms
 * that can set it (new product, add variant, edit variant) so the wording
 * and the 1–365 rule can't drift between them.
 *
 * The estimate is only editable while preorder is on, but it isn't wiped
 * when preorder is switched off — a shop pausing preorders for a week
 * shouldn't have to remember what the wait was.
 */
export function PreorderFields({
  allowPreorder,
  leadTimeDays,
  depositPercent,
  onAllowPreorderChange,
  onLeadTimeChange,
  onDepositPercentChange,
  error,
  depositError,
}: PreorderFieldsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <Label className="flex items-center gap-1.5 text-sm font-normal">
        <Checkbox
          checked={allowPreorder}
          onCheckedChange={(checked) => onAllowPreorderChange(checked === true)}
        />
        Allow preorder (sell before stock arrives)
      </Label>

      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-sm">Estimated wait (days)</span>
        <Input
          type="number"
          step="1"
          min={MIN_PREORDER_LEAD_TIME_DAYS}
          max={MAX_PREORDER_LEAD_TIME_DAYS}
          // Never a number: an unknown wait is a legitimate answer, and a
          // placeholder that reads as a value is how a made-up date ends up
          // being quoted to a customer.
          placeholder="Not sure yet"
          disabled={!allowPreorder}
          value={leadTimeDays}
          onChange={(e) => onLeadTimeChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={controls.input}
        />
        {error ? (
          <span className="text-sm text-destructive">{error}</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Leave empty if you don&apos;t know yet. Selling past zero takes this variant&apos;s
            stock negative — that&apos;s the backlog you owe customers.
          </span>
        )}
      </Label>

      {/* Not a pricing rule — a payment-method one. Preorders are the case
          where cash on delivery hurts most: the shop buys stock it can't
          return against an order the customer can walk away from, weeks
          later. A deposit is the middle ground that used to be unavailable:
          enough committed to cover the shop's outlay without asking for the
          whole price months before delivery. Same enable rule as the
          estimate, and likewise not reset when preorder is switched off. */}
      <Label className="flex flex-col items-stretch gap-1.5">
        <span className="text-sm">Deposit required (%)</span>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            step="1"
            min={MIN_PREORDER_DEPOSIT_PERCENT}
            max={MAX_PREORDER_DEPOSIT_PERCENT}
            inputMode="numeric"
            placeholder="0"
            disabled={!allowPreorder}
            value={depositPercent}
            onChange={(e) => onDepositPercentChange(e.target.value)}
            aria-invalid={depositError ? true : undefined}
            className={cn(controls.input, "w-28")}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {DEPOSIT_PRESETS.map((preset) => {
              const isActive =
                depositPercent.trim() !== "" &&
                preorderDepositPercentValue(depositPercent) === preset.value;
              return (
                <Button
                  key={preset.value}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  disabled={!allowPreorder}
                  onClick={() => onDepositPercentChange(String(preset.value))}
                  className={controls.buttonSm}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>

        {depositError ? (
          <span className="text-sm text-destructive">{depositError}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{depositHint(depositPercent)}</span>
        )}
      </Label>
    </div>
  );
}
