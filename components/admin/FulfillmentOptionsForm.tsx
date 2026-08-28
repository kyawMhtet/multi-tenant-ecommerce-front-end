"use client";

import { Bike, Store } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// The two flags as they're named on the wire, so this state drops straight
// into UpdateTenantPayload with no translation.
export interface FulfillmentOptionsState {
  allows_delivery: boolean;
  allows_pickup: boolean;
}

export type FulfillmentOptionKey = keyof FulfillmentOptionsState;

export const FULFILLMENT_OPTION_KEYS = ["allows_delivery", "allows_pickup"] as const;

const OPTIONS: Array<{
  key: FulfillmentOptionKey;
  other: FulfillmentOptionKey;
  label: string;
  description: string;
  icon: typeof Bike;
}> = [
  {
    key: "allows_delivery",
    other: "allows_pickup",
    label: "Delivery",
    description: "Customers enter an address at checkout and you deliver to them.",
    icon: Bike,
  },
  {
    key: "allows_pickup",
    other: "allows_delivery",
    label: "Pickup",
    description: "Customers collect from the shop — checkout asks for no address.",
    icon: Store,
  },
];

interface FulfillmentOptionsFormProps {
  value: FulfillmentOptionsState;
  onChange: (value: FulfillmentOptionsState) => void;
  error?: string;
}

/**
 * How the shop hands orders over. Exactly the two booleans the storefront
 * checkout reads back off GET /public/shop — turning delivery off is what
 * hides the address block from customers entirely.
 *
 * A shop can't offer neither: the backend rejects it (a 422 on
 * allows_delivery, checked against what's currently stored, so two separate
 * requests can't sneak past it either). Whichever switch is the last one on
 * is disabled here so that's visible before saving rather than after — the
 * 422 is still handled upstream, since another admin can turn one off
 * between this page loading and this form saving.
 */
export function FulfillmentOptionsForm({ value, onChange, error }: FulfillmentOptionsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {OPTIONS.map(({ key, other, label, description, icon: Icon }) => {
        const isOn = value[key];
        const isLastEnabled = isOn && !value[other];
        // Lands on Switch's hidden checkbox input (Base UI puts the `id`
        // prop there, not on the role="switch" element), which is what makes
        // htmlFor associate and the label text clickable.
        const id = `fulfillment-${key}`;
        const descriptionId = `${id}-description`;

        return (
          <div key={key} className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Label htmlFor={id} className="gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {label}
              </Label>
              <span id={descriptionId} className={cn(typography.muted, "pl-6")}>
                {description}
              </span>
            </div>
            <Switch
              id={id}
              checked={isOn}
              disabled={isLastEnabled}
              aria-describedby={descriptionId}
              aria-invalid={error ? true : undefined}
              onCheckedChange={(checked) => onChange({ ...value, [key]: checked })}
            />
          </div>
        );
      })}

      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        <span className={typography.muted}>
          Your shop has to offer at least one — the last one left on can&apos;t be switched off.
        </span>
      )}
    </div>
  );
}
