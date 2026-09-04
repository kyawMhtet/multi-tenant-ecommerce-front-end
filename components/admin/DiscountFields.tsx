"use client";

import { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DiscountBadge } from "@/components/admin/DiscountBadge";
import { controls, notice, noticeTone } from "@/lib/design-tokens";
import {
  discountState,
  discountValueLabel,
  endsAtToLastDay,
  lastDayToEndsAt,
  shopDate,
  shopMidnightIso,
} from "@/lib/discount";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { DiscountType, ProductVariant, UpdateVariantPayload } from "@/lib/types";

// The backend's rule on discount_value: >= 0, and <= 100 for a percentage.
export const MAX_DISCOUNT_PERCENT = 100;

/**
 * A promotion as the form holds it.
 *
 * `value` is the field that decides everything: blank means this form is
 * saying nothing about the promotion, and the four discount keys are left out
 * of the PATCH entirely. Withdrawing one is a separate, explicit action (see
 * the Remove control below) rather than something that can happen by clearing
 * a field and not noticing.
 *
 * The dates are "YYYY-MM-DD" on the SHOP's clock, and `lastDayOn` is the last
 * day the promotion runs — not the exclusive boundary the API stores. That
 * conversion is lib/discount.ts's job, once, on the way in and out.
 */
export interface DiscountFormState {
  type: DiscountType;
  value: string;
  startsOn: string;
  lastDayOn: string;
}

export interface DiscountErrors {
  value?: string;
  dates?: string;
}

/** Trailing zeros off a decimal string: "20.00" is a percentage, not money. */
function editableValue(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? String(amount) : "";
}

export function discountFormStateFromVariant(
  variant: ProductVariant,
  timeZone: string,
): DiscountFormState {
  const hasPromotion = discountState(variant) !== "none";

  return {
    // A variant with nothing running still needs a type selected for the
    // field's unit to mean anything; percent is what a shop reaches for.
    type: variant.discount_type ?? "percent",
    value: hasPromotion ? editableValue(variant.discount_value) : "",
    startsOn: variant.discount_starts_at ? shopDate(variant.discount_starts_at, timeZone) : "",
    lastDayOn: variant.discount_ends_at
      ? endsAtToLastDay(variant.discount_ends_at, timeZone)
      : "",
  };
}

/**
 * Mirrors the backend rules, plus one this app adds: a zero discount.
 *
 * The API accepts it (0 is a valid discount_value) and then nothing runs,
 * because discountActive() treats a zero value as no promotion whatever the
 * type says. Saving that leaves "0% off" sitting in the form describing a
 * promotion the storefront will never show, so it's pushed at the control
 * that actually expresses the intent instead.
 */
export function validateDiscount(
  form: DiscountFormState,
  hasExistingPromotion: boolean,
): DiscountErrors {
  const errors: DiscountErrors = {};
  const trimmed = form.value.trim();

  if (!trimmed) {
    // Blank on a variant that HAS a promotion is ambiguous — it reads as
    // "withdraw this" and behaves as "leave it alone" — so it's refused
    // rather than quietly picking one of the two.
    if (hasExistingPromotion) {
      errors.value = "Enter a discount, or use Remove promotion to withdraw it.";
    }
    return errors;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.value = "Enter a discount above zero, or use Remove promotion.";
  } else if (form.type === "percent" && amount > MAX_DISCOUNT_PERCENT) {
    errors.value = `A percentage discount can't be more than ${MAX_DISCOUNT_PERCENT}%.`;
  }

  // The API compares the two instants (ends must be after starts) and only
  // when a start is sent. Compared here as dates because that's what the shop
  // typed: an end on the same day is fine — the promotion runs that day.
  if (form.startsOn && form.lastDayOn && form.lastDayOn < form.startsOn) {
    errors.dates = "The last day can't be before the start date.";
  }

  return errors;
}

/**
 * The four wire fields, or nothing at all.
 *
 * An empty object is the important case: it leaves the variant's promotion
 * exactly as it was, which is what lets the rest of this form resend its full
 * field set without touching a promotion it never showed.
 */
export function discountPayload(
  form: DiscountFormState,
  timeZone: string,
): Pick<
  UpdateVariantPayload,
  "discount_type" | "discount_value" | "discount_starts_at" | "discount_ends_at"
> {
  const trimmed = form.value.trim();
  if (!trimmed) return {};

  return {
    discount_type: form.type,
    discount_value: Number(trimmed),
    // Null is a real instruction here, not an omission: it clears a bound the
    // variant used to have. "No start" means live the moment it saves.
    discount_starts_at: form.startsOn ? shopMidnightIso(form.startsOn, timeZone) : null,
    // The date field holds the last day it RUNS; the API wants the exclusive
    // end, which is midnight the morning after.
    discount_ends_at: form.lastDayOn ? lastDayToEndsAt(form.lastDayOn, timeZone) : null,
  };
}

const TYPE_OPTIONS: Array<{ value: DiscountType; label: string }> = [
  { value: "percent", label: "Percentage" },
  { value: "fixed", label: "Fixed amount" },
];

function unitWord(type: DiscountType, currency: string | null): string {
  return type === "percent" ? "%" : (currency ?? "off the price");
}

function dateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function displayDate(value: string, emptyLabel: string): string {
  const date = dateValue(value);
  return date ? format(date, "MMM d, yyyy") : emptyLabel;
}

function DiscountDatePicker({
  label,
  value,
  onChange,
  emptyLabel,
  hint,
  minDate,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  hint: string;
  minDate?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = dateValue(value);
  const minimum = dateValue(minDate ?? "");

  function handleSelect(date: Date | undefined) {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    if (date) setOpen(false);
  }

  return (
    <Label className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
      <span className="text-sm">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-invalid={invalid ? true : undefined}
              className={cn(controls.input, "w-full justify-start font-normal")}
            />
          }
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className={cn(!value && "text-muted-foreground")}>{displayDate(value, emptyLabel)}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={minimum ? { before: minimum } : undefined}
            defaultMonth={selected ?? minimum}
          />
          <div className="flex items-center justify-between border-t p-2.5">
            <span className="px-1 text-xs text-muted-foreground">{hint}</span>
            {value && (
              <Button type="button" variant="ghost" onClick={() => { onChange(""); setOpen(false); }} className={controls.buttonSm}>
                Clear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Label>
  );
}

interface DiscountFieldsProps {
  variant: Pick<ProductVariant, "selling_price" | "discount_type" | "discount_value" | "discount_starts_at" | "discount_ends_at" | "discount_active">;
  form: DiscountFormState;
  onChange: (form: DiscountFormState) => void;
  errors: DiscountErrors;
  // The shop's zone and currency — the window is set on the shop's clock, and
  // a fixed discount is in the shop's money.
  timeZone: string;
  currency: string | null;
  // Withdrawing sends `{ discount_type: null }` on its own and takes effect
  // immediately, so it is deliberately not part of this form's save.
  onRemove: () => void;
  isRemoving: boolean;
}

/**
 * Running a promotion on one variant.
 *
 * Three things the shop will otherwise get wrong, all of them silent, all of
 * them handled here rather than left to be discovered:
 *
 *   - the unit follows the TYPE, so switching type reinterprets a number the
 *     shop already typed. That gets said out loud at the moment of the switch,
 *     not validated afterwards;
 *   - the stored end is EXCLUSIVE, so the field asks for the last day it runs
 *     and converts, rather than asking a shop to add a day itself;
 *   - a fixed discount can exceed the price, which clamps the item to free.
 *     Warned about, never blocked — clearance is real, and so, occasionally,
 *     is giving something away.
 */
export function DiscountFields({
  variant,
  form,
  onChange,
  errors,
  timeZone,
  currency,
  onRemove,
  isRemoving,
}: DiscountFieldsProps) {
  // Which unit the number in the field was typed under, remembered only long
  // enough to say it changed. Cleared as soon as the shop edits the value —
  // at that point they're typing under the new unit and know it.
  const [switchedFrom, setSwitchedFrom] = useState<DiscountType | null>(null);

  const state = discountState(variant);
  const hasPromotion = state !== "none";
  const amount = Number(form.value.trim());
  const hasAmount = form.value.trim() !== "" && Number.isFinite(amount) && amount > 0;

  // What the shop is about to set, so a fixed amount can be sanity-checked
  // against the price it comes off. A preview of an unsaved edit — the API
  // has no figure for a promotion that doesn't exist yet — and never a number
  // presented as what a customer is being charged: that is effective_price,
  // and it comes back from the save.
  const listPrice = Number(variant.selling_price);
  const preview =
    hasAmount && Number.isFinite(listPrice)
      ? Math.max(0, listPrice - (form.type === "percent" ? (listPrice * amount) / 100 : amount))
      : null;

  function update<K extends keyof DiscountFormState>(key: K, value: DiscountFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  function handleTypeChange(next: DiscountType) {
    if (next === form.type) return;
    // Only worth saying when there IS a number to reinterpret. "20" going from
    // 20% off to 20 Kyat off is the whole trap.
    setSwitchedFrom(hasAmount ? form.type : null);
    update("type", next);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          Discount
          {/* The SAVED promotion, not what's in the fields — so the shop can
              see it's editing a live sale rather than drafting one. */}
          <DiscountBadge
            variant={variant}
            detail={
              variant.discount_type
                ? discountValueLabel(variant.discount_type, variant.discount_value, currency)
                : null
            }
          />
        </span>

        {/* Its own request, sending `{ discount_type: null }` and nothing
            else — the server clears the value and both dates with it, so
            withdrawing can't half-apply the way four blanked fields could. */}
        {hasPromotion && (
          <Button
            type="button"
            variant="outline"
            disabled={isRemoving}
            onClick={onRemove}
            className={controls.buttonSm}
          >
            {isRemoving ? "Removing..." : "Remove promotion"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Label className="flex flex-col items-stretch gap-1.5">
          <span className="text-sm">Type</span>
          <div className="flex items-center gap-1.5">
            {TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={form.type === option.value ? "default" : "outline"}
                onClick={() => handleTypeChange(option.value)}
                className={controls.buttonSm}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </Label>

        <Label className="flex flex-1 flex-col items-stretch gap-1.5">
          <span className="text-sm">Amount ({unitWord(form.type, currency)})</span>
          <Input
            type="number"
            step={form.type === "percent" ? "1" : "0.01"}
            min="0"
            max={form.type === "percent" ? MAX_DISCOUNT_PERCENT : undefined}
            inputMode="decimal"
            // Blank is a real state — this form simply isn't setting a
            // promotion — so the placeholder must not read as a value.
            placeholder="No discount"
            value={form.value}
            onChange={(e) => {
              setSwitchedFrom(null);
              update("value", e.target.value);
            }}
            aria-invalid={errors.value ? true : undefined}
            className={cn(controls.input, "w-36")}
          />
        </Label>
      </div>

      {errors.value && <span className="text-sm text-destructive">{errors.value}</span>}

      {/* Said at the moment of the switch, because by the time it's validated
          it is already a plausible-looking wrong number. */}
      {switchedFrom && (
        <p className={cn(notice, noticeTone.warning)}>
          <span>
            {form.value.trim()} now means{" "}
            <strong>{discountValueLabel(form.type, amount, currency)}</strong>, not{" "}
            {discountValueLabel(switchedFrom, amount, currency)}. Check the amount before you save.
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <DiscountDatePicker
          label="Starts"
          value={form.startsOn}
          onChange={(value) => update("startsOn", value)}
          emptyLabel="Start immediately"
          hint="Leave empty to start now."
        />

        {/* Not "Ends": the API stores an exclusive boundary, and a shop that
          types the day it wants the sale to stop into a field labelled
          "Ends" loses its last day without ever seeing why. */}
        <DiscountDatePicker
          label="Last day"
          value={form.lastDayOn}
          onChange={(value) => update("lastDayOn", value)}
          emptyLabel="No end date"
          hint="Runs to the end of this day."
          minDate={form.startsOn || undefined}
          invalid={Boolean(errors.dates)}
        />
      </div>

      {errors.dates && <span className="text-sm text-destructive">{errors.dates}</span>}

      {/* Dates are stored in UTC and no shop is in UTC — a promotion set from
          a laptop on holiday must still start at midnight in the shop. */}
      <span className="text-xs text-muted-foreground">
        Times are {timeZone.replace(/_/g, " ")} — the shop&apos;s timezone.
      </span>

      {preview !== null &&
        (preview <= 0 ? (
          <p className={cn(notice, noticeTone.warning)}>
            <span>
              This discount is at or above the price, so the item would sell for{" "}
              <strong>{formatPrice(0)}</strong>. Usually a repriced item with a promotion nobody
              withdrew — check the amount.
            </span>
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">
            Would sell for <span className="tabular-nums">{formatPrice(preview)}</span>, down from{" "}
            <span className="tabular-nums">{formatPrice(listPrice)}</span>. Confirmed by the server
            when you save.
          </span>
        ))}
    </div>
  );
}
