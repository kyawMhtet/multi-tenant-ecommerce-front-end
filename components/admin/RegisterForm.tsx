import { AuthField } from "@/components/shared/AuthField";
import { TimezoneSelect } from "@/components/admin/TimezoneSelect";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SLUG_MAX_LENGTH } from "@/lib/slug";
import { timezoneHoursLabel } from "@/lib/timezones";
import { SHOP_CURRENCIES, type RegisterPayload, type ShopCurrency } from "@/lib/types";
import { typography } from "@/lib/design-tokens";

// Keyed by the API's own field names (not this app's usual camelCase form
// state) so a Laravel 422's `errors` keys land on these fields directly —
// see RegisterPayload's comment. currency and timezone are required here
// even though the API defaults them: the whole point of showing the fields
// is that the default is wrong for anyone outside Myanmar.
export type RegisterFormState = Required<RegisterPayload>;

// Base UI's <SelectValue> renders the raw value unless the root is given an
// items label map — same fix as the filter bars.
const CURRENCY_ITEMS: Record<ShopCurrency, string> = {
  MMK: "MMK — Myanmar Kyat",
  THB: "THB — Thai Baht",
  USD: "USD — US Dollar",
};

export type RegisterFormErrors = Partial<Record<keyof RegisterFormState, string>>;

export interface RegisterFormProps {
  form: RegisterFormState;
  errors: RegisterFormErrors;
  onFieldChange: <K extends keyof RegisterFormState>(
    key: K,
    value: RegisterFormState[K],
  ) => void;
  // Fully-built host the storefront will live on, e.g.
  // "aung-shop.localhost:3000" — the page owns building it, since the
  // domain part can only be read from window after mount.
  slugPreview: string;
}

export function RegisterForm({ form, errors, onFieldChange, slugPreview }: RegisterFormProps) {
  return (
    <>
      <AuthField
        label="Shop name"
        type="text"
        placeholder="Aung Shop"
        value={form.shop_name}
        onChange={(e) => onFieldChange("shop_name", e.target.value)}
        error={errors.shop_name}
      />

      <AuthField
        label="Shop address"
        type="text"
        placeholder="aung-shop"
        value={form.slug}
        // Lowercased as typed rather than rejected after the fact: it's the
        // one slug rule where the correction is unambiguous.
        onChange={(e) => onFieldChange("slug", e.target.value.toLowerCase())}
        maxLength={SLUG_MAX_LENGTH}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        error={errors.slug}
        hint={
          <>
            Your storefront:{" "}
            <span className="font-medium text-foreground">{slugPreview}</span>
          </>
        }
      />

      <AuthField
        label="Your name"
        type="text"
        placeholder="Aung Aung"
        autoComplete="name"
        value={form.owner_name}
        onChange={(e) => onFieldChange("owner_name", e.target.value)}
        error={errors.owner_name}
      />

      <AuthField
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={form.owner_email}
        onChange={(e) => onFieldChange("owner_email", e.target.value)}
        error={errors.owner_email}
      />

      <AuthField
        label="Phone"
        type="tel"
        placeholder="09123456789"
        autoComplete="tel"
        value={form.owner_phone}
        onChange={(e) => onFieldChange("owner_phone", e.target.value)}
        error={errors.owner_phone}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-currency" className="text-sm font-medium">
            Currency
          </Label>
          <Select
            items={CURRENCY_ITEMS}
            value={form.currency}
            onValueChange={(value) => {
              if (typeof value === "string") onFieldChange("currency", value as ShopCurrency);
            }}
          >
            <SelectTrigger
              id="signup-currency"
              aria-invalid={errors.currency ? true : undefined}
              className="h-11 w-full px-3.5 md:text-base"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHOP_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {CURRENCY_ITEMS[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currency ? (
            <span className="text-sm text-destructive">{errors.currency}</span>
          ) : (
            // Said here rather than discovered later: every order ever
            // recorded is stored as a bare number, so changing this
            // afterwards would silently reprice the shop's whole history.
            // That's why the API won't let it change at all.
            <span className={typography.muted}>Permanent — this can&apos;t be changed later.</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-timezone" className="text-sm font-medium">
            Timezone
          </Label>
          <TimezoneSelect
            id="signup-timezone"
            value={form.timezone}
            onChange={(value) => onFieldChange("timezone", value)}
            invalid={Boolean(errors.timezone)}
            triggerClassName="h-11 px-3.5 md:text-base"
          />
          {errors.timezone ? (
            <span className="text-sm text-destructive">{errors.timezone}</span>
          ) : (
            <span className={typography.muted}>
              {timezoneHoursLabel(form.timezone) ?? "Used for your opening hours."} · editable
              later
            </span>
          )}
        </div>
      </div>

      <AuthField
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => onFieldChange("password", e.target.value)}
        error={errors.password}
        hint="At least 8 characters."
      />
    </>
  );
}
