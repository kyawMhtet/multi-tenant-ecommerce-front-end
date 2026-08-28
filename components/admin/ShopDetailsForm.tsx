"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { typography } from "@/lib/design-tokens";

/**
 * Keyed by the API's own snake_case field names rather than this app's
 * usual camelCase form state, so a Laravel 422's `errors` keys land on
 * these fields directly with no translation layer — the same trick
 * RegisterFormState uses.
 *
 * Every value is a plain string: "" is how a field is cleared over
 * multipart (see UpdateTenantPayload), so there is no null in form state.
 */
export interface ShopDetailsFormState {
  name: string;
  address: string;
  business_phone: string;
  business_email: string;
}

export const SHOP_DETAILS_KEYS = [
  "name",
  "address",
  "business_phone",
  "business_email",
] as const satisfies readonly (keyof ShopDetailsFormState)[];

export type ShopDetailsKey = (typeof SHOP_DETAILS_KEYS)[number];

export type ShopDetailsErrors = Partial<Record<ShopDetailsKey, string>>;

interface ShopDetailsFormProps {
  form: ShopDetailsFormState;
  errors: ShopDetailsErrors;
  onFieldChange: (key: ShopDetailsKey, value: string) => void;
  // Shown read-only: UpdateTenantRequest accepts neither. Changing the slug
  // would break every previously shared storefront link, and changing the
  // currency would retroactively reinterpret every historical order total,
  // since money columns carry no currency tag.
  slug: string;
  currency: string;
}

export function ShopDetailsForm({
  form,
  errors,
  onFieldChange,
  slug,
  currency,
}: ShopDetailsFormProps) {
  return (
    <>
      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-sm">Shop name</span>
        <Input
          type="text"
          maxLength={255}
          value={form.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
        />
        {errors.name && <span className="text-sm text-destructive">{errors.name}</span>}
      </Label>

      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-sm">Address</span>
        <Textarea
          rows={2}
          maxLength={500}
          placeholder="Where customers can find you"
          value={form.address}
          onChange={(e) => onFieldChange("address", e.target.value)}
        />
        {errors.address && <span className="text-sm text-destructive">{errors.address}</span>}
      </Label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="flex flex-col items-stretch gap-1">
          <span className="text-sm">Phone</span>
          <Input
            type="tel"
            maxLength={32}
            placeholder="09123456789"
            value={form.business_phone}
            onChange={(e) => onFieldChange("business_phone", e.target.value)}
          />
          {errors.business_phone && (
            <span className="text-sm text-destructive">{errors.business_phone}</span>
          )}
        </Label>

        <Label className="flex flex-col items-stretch gap-1">
          <span className="text-sm">Email</span>
          <Input
            type="email"
            maxLength={255}
            placeholder="shop@example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={form.business_email}
            onChange={(e) => onFieldChange("business_email", e.target.value)}
          />
          {errors.business_email && (
            <span className="text-sm text-destructive">{errors.business_email}</span>
          )}
        </Label>
      </div>

      <div className="flex flex-wrap gap-x-10 gap-y-3 border-t pt-4">
        <div className="flex flex-col gap-1">
          <span className={typography.muted}>Storefront address</span>
          <span className="text-sm font-medium">{slug}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={typography.muted}>Currency</span>
          <span className="text-sm font-medium">{currency}</span>
        </div>
        <p className="w-full text-xs text-muted-foreground">
          These two are fixed after signup — the storefront address is baked into every link
          you&apos;ve shared, and the currency into every order already recorded.
        </p>
      </div>
    </>
  );
}
