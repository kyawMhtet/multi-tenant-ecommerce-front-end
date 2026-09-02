"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { controls } from "@/lib/design-tokens";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface PreorderFieldsProps {
  allowPreorder: boolean;
  // A string, like every other numeric input's state here — "" is what
  // "no estimate" looks like in a text field.
  leadTimeDays: string;
  requiresPrepayment: boolean;
  onAllowPreorderChange: (value: boolean) => void;
  onLeadTimeChange: (value: string) => void;
  onRequiresPrepaymentChange: (value: boolean) => void;
  error?: string;
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
  requiresPrepayment,
  onAllowPreorderChange,
  onLeadTimeChange,
  onRequiresPrepaymentChange,
  error,
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
          later. Same enable rule as the estimate, and likewise not reset
          when preorder is switched off. */}
      <Label className="flex flex-col items-stretch gap-1">
        <span className="flex items-center gap-1.5 text-sm font-normal">
          <Checkbox
            checked={requiresPrepayment}
            disabled={!allowPreorder}
            onCheckedChange={(checked) => onRequiresPrepaymentChange(checked === true)}
          />
          Require payment in advance
        </span>
        <span className="pl-6 text-xs text-muted-foreground">
          Customers can&apos;t pay cash on delivery for this item while it&apos;s on preorder.
        </span>
      </Label>
    </div>
  );
}
