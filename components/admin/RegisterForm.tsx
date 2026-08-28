import { AuthField } from "@/components/admin/AuthField";
import { SLUG_MAX_LENGTH } from "@/lib/slug";
import type { RegisterPayload } from "@/lib/types";

// Keyed by the API's own field names (not this app's usual camelCase form
// state) so a Laravel 422's `errors` keys land on these fields directly —
// see RegisterPayload's comment.
export type RegisterFormState = RegisterPayload;

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
