"use client";

import { useState } from "react";
import { Bike, ChevronDown, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storefrontType } from "@/lib/design-tokens";
import type { FulfillmentType } from "@/lib/types";
import { cn } from "@/lib/utils";

// The address form's own state — all strings, since these are controlled
// inputs. Blank optional fields are dropped on the way to the API.
export interface AddressDraft {
  fullAddress: string;
  houseNumber: string;
  street: string;
  township: string;
  city: string;
  note: string;
}

export const EMPTY_ADDRESS: AddressDraft = {
  fullAddress: "",
  houseNumber: "",
  street: "",
  township: "",
  city: "",
  note: "",
};

export interface FulfillmentErrors {
  fulfillment?: string;
  fullAddress?: string;
  address?: string;
}

interface FulfillmentFieldsProps {
  // What this shop offers, from GET /public/shop. Two options means the
  // customer chooses; one means there is nothing to choose, so the toggle
  // is replaced by a plain statement of what will happen and the parent
  // sends that value regardless. Never empty — the parent doesn't render
  // this at all in that case.
  options: readonly FulfillmentType[];
  // null until the customer picks — never defaulted, so neither mistake
  // (asking a pickup customer for an address, or shipping without one) can
  // happen by omission. With a single option the parent passes that option
  // in from the start.
  value: FulfillmentType | null;
  onChange: (value: FulfillmentType) => void;
  address: AddressDraft;
  onAddressChange: (address: AddressDraft) => void;
  errors: FulfillmentErrors;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: FulfillmentType; label: string; hint: string; icon: typeof Bike }> = [
  { value: "delivery", label: "Delivery", hint: "To your address", icon: Bike },
  { value: "pickup", label: "Pickup", hint: "Collect in store", icon: Store },
];

export function FulfillmentFields({
  options,
  value,
  onChange,
  address,
  onAddressChange,
  errors,
  disabled = false,
}: FulfillmentFieldsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const offered = OPTIONS.filter((option) => options.includes(option.value));
  const onlyOption = offered.length === 1 ? offered[0] : null;
  const OnlyIcon = onlyOption?.icon;

  function setField(key: keyof AddressDraft, next: string) {
    onAddressChange({ ...address, [key]: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className={cn(storefrontType.navLabel, "text-muted-foreground")}>How to get it</span>

      {/* Stated, not chosen. A pickup-only shop that simply hid the toggle
          would leave a customer assuming delivery until nothing arrived, so
          the one option the shop does offer is still named. */}
      {onlyOption ? (
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-3 text-storefront-ink">
          {OnlyIcon && <OnlyIcon className="size-4 shrink-0" aria-hidden="true" />}
          <span className="text-sm font-medium">{onlyOption.label}</span>
          <span className="text-xs text-muted-foreground">{onlyOption.hint}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {offered.map((option) => {
            const isSelected = value === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-all disabled:opacity-50",
                  isSelected
                    ? "border-storefront-ink bg-storefront-ink/5 text-storefront-ink"
                    : "border-black/10 bg-white text-storefront-ink hover:border-storefront-ink/50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </button>
            );
          })}
        </div>
      )}

      {errors.fulfillment && (
        <span className="text-xs text-destructive">{errors.fulfillment}</span>
      )}

      {/* Hidden entirely for pickup — there's no address to collect, and the
          backend discards anything sent. */}
      {value === "delivery" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            {/* One prominent free-text field, deliberately: local addresses
                lean on landmarks and townships ("behind the market, near the
                pagoda") in ways fixed fields can't hold, and this is the one
                people actually complete on a phone. */}
            <Textarea
              rows={3}
              placeholder="Delivery address — building, street, township, and any landmark"
              value={address.fullAddress}
              disabled={disabled}
              onChange={(e) => setField("fullAddress", e.target.value)}
              aria-label="Delivery address"
              aria-invalid={Boolean(errors.fullAddress || errors.address)}
            />
            {(errors.fullAddress || errors.address) && (
              <span className="text-xs text-destructive">
                {errors.fullAddress ?? errors.address}
              </span>
            )}
          </div>

          {/* Visible, not buried: a note is what stops a driver calling to
              ask which floor. */}
          <Input
            type="text"
            placeholder="Note for the driver (optional)"
            value={address.note}
            disabled={disabled}
            onChange={(e) => setField("note", e.target.value)}
            aria-label="Note for the driver"
            className="h-11"
          />

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
            className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-storefront-ink"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", showDetails && "rotate-180")}
              aria-hidden="true"
            />
            Add more details (optional)
          </button>

          {showDetails && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="text"
                placeholder="House no."
                value={address.houseNumber}
                disabled={disabled}
                onChange={(e) => setField("houseNumber", e.target.value)}
                aria-label="House number"
                className="h-11"
              />
              <Input
                type="text"
                placeholder="Street"
                value={address.street}
                disabled={disabled}
                onChange={(e) => setField("street", e.target.value)}
                aria-label="Street"
                className="h-11"
              />
              <Input
                type="text"
                placeholder="Township"
                value={address.township}
                disabled={disabled}
                onChange={(e) => setField("township", e.target.value)}
                aria-label="Township"
                className="h-11"
              />
              <Input
                type="text"
                placeholder="City"
                value={address.city}
                disabled={disabled}
                onChange={(e) => setField("city", e.target.value)}
                aria-label="City"
                className="h-11"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
