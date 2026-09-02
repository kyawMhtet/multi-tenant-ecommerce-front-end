"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useUpdateTenant } from "@/lib/hooks/useUpdateTenant";
import { normalizeBusinessHours } from "@/lib/shop-profile";
import {
  BUSINESS_HOURS_DAYS,
  type BusinessHours,
  type Tenant,
  type UpdateTenantPayload,
} from "@/lib/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/admin/SettingsSection";
import {
  BusinessHoursEditor,
  type BusinessHoursErrors,
} from "@/components/admin/BusinessHoursEditor";
import {
  SHOP_DETAILS_KEYS,
  ShopDetailsForm,
  type ShopDetailsErrors,
  type ShopDetailsFormState,
  type ShopDetailsKey,
} from "@/components/admin/ShopDetailsForm";
import { ShopImageField, type ShopImageFieldValue } from "@/components/admin/ShopImageField";
import { TimezoneSelect } from "@/components/admin/TimezoneSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { timezoneHoursLabel } from "@/lib/timezones";
import { controls, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  FULFILLMENT_OPTION_KEYS,
  FulfillmentOptionsForm,
  type FulfillmentOptionsState,
} from "@/components/admin/FulfillmentOptionsForm";
import {
  SOCIAL_PLATFORMS,
  SocialLinksForm,
  type SocialLinksErrors,
  type SocialLinksFormState,
  type SocialPlatform,
} from "@/components/admin/SocialLinksForm";

interface ShopProfileFormState extends ShopDetailsFormState {
  business_hours: BusinessHours;
  social_links: SocialLinksFormState;
  fulfillment: FulfillmentOptionsState;
  // A string like every other field here, even though it's money: it's what
  // the input holds, and "" is a state the user can reach mid-typing.
  delivery_fee: string;
  timezone: string;
}

interface ShopProfileErrors {
  fields: ShopDetailsErrors;
  hours: BusinessHoursErrors;
  social: SocialLinksErrors;
  logo?: string;
  cover?: string;
  // One message for the pair: the only rule either flag can break is about
  // both of them at once ("at least one"), so two separate slots would only
  // ever say the same thing twice.
  fulfillment?: string;
  delivery_fee?: string;
  timezone?: string;
}

const NO_IMAGE_CHANGE: ShopImageFieldValue = { file: null, remove: false };

// date_format:H:i server-side. <Input type="time"> already produces exactly
// this, so the check only matters where the browser falls back to a plain
// text input.
const TIME_PATTERN = /^\d{2}:\d{2}$/;

// social_links.viber_phone => regex:/^[0-9+\-\s()]+$/ — mirrored exactly.
const VIBER_PATTERN = /^[0-9+\-\s()]+$/;

function emptyErrors(): ShopProfileErrors {
  return { fields: {}, hours: {}, social: {} };
}

function hasErrors(errors: ShopProfileErrors): boolean {
  return (
    Object.keys(errors.fields).length > 0 ||
    Object.keys(errors.hours).length > 0 ||
    Object.keys(errors.social).length > 0 ||
    errors.logo !== undefined ||
    errors.cover !== undefined ||
    errors.fulfillment !== undefined ||
    errors.delivery_fee !== undefined ||
    errors.timezone !== undefined
  );
}

// Nulls become "" on the way in — form state is all strings, and "" is also
// what clears a field on the way back out.
function toFormState(tenant: Tenant): ShopProfileFormState {
  const social = {} as SocialLinksFormState;
  SOCIAL_PLATFORMS.forEach((platform) => {
    social[platform] = tenant.social_links?.[platform] ?? "";
  });

  return {
    name: tenant.name,
    address: tenant.address ?? "",
    business_phone: tenant.business_phone ?? "",
    business_email: tenant.business_email ?? "",
    business_hours: normalizeBusinessHours(tenant.business_hours),
    social_links: social,
    fulfillment: {
      allows_delivery: tenant.allows_delivery,
      allows_pickup: tenant.allows_pickup,
    },
    delivery_fee: tenant.delivery_fee,
    timezone: tenant.timezone,
  };
}

// Client-side mirror of UpdateTenantRequest::rules(). Deliberately not
// stricter than the backend: anything the API would accept saves here too.
function validate(form: ShopProfileFormState): ShopProfileErrors {
  const errors = emptyErrors();

  const name = form.name.trim();
  if (!name) {
    // 'name' => ['sometimes', 'string', ...] — an empty multipart value
    // becomes null before validation and fails 'string', so a blank name is
    // a 422, not a clear.
    errors.fields.name = "Shop name is required.";
  } else if (name.length > 255) {
    errors.fields.name = "Shop name must be 255 characters or less.";
  }

  if (form.address.trim().length > 500) {
    errors.fields.address = "Address must be 500 characters or less.";
  }

  if (form.business_phone.trim().length > 32) {
    errors.fields.business_phone = "Phone must be 32 characters or less.";
  }

  const email = form.business_email.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.fields.business_email = "Enter a valid email address.";
  } else if (email.length > 255) {
    errors.fields.business_email = "Email must be 255 characters or less.";
  }

  BUSINESS_HOURS_DAYS.forEach((day) => {
    form.business_hours[day].forEach((interval, index) => {
      const key = `${day}.${index}`;
      if (!interval.open || !interval.close) {
        errors.hours[key] = "Enter both an opening and a closing time.";
      } else if (!TIME_PATTERN.test(interval.open) || !TIME_PATTERN.test(interval.close)) {
        errors.hours[key] = "Use 24-hour times like 09:00.";
      } else if (interval.close <= interval.open) {
        // Checked here rather than left to the 422: the backend's after()
        // hook rejects close <= open, and overnight spans are deliberately
        // unsupported, so the fix has to be spelled out.
        errors.hours[key] =
          "Closing time must be after the opening time. Overnight hours aren't supported — use 23:59.";
      }
    });
  });

  SOCIAL_PLATFORMS.forEach((platform) => {
    const value = form.social_links[platform].trim();
    if (!value) return;

    if (platform === "viber_phone") {
      if (value.length > 32) {
        errors.social.viber_phone = "Viber number must be 32 characters or less.";
      } else if (!VIBER_PATTERN.test(value)) {
        errors.social.viber_phone =
          "Use the number only — digits, spaces, +, - and brackets are allowed.";
      }
      return;
    }

    if (value.length > 255) {
      errors.social[platform] = "Link must be 255 characters or less.";
    } else if (!isHttpsUrl(value)) {
      // url:https isn't pedantry server-side: a free string rendered into
      // an <a href> on the public storefront is stored XSS.
      errors.social[platform] = "Enter a full link starting with https://";
    }
  });

  // Unreachable through the switches themselves (the last one on is
  // disabled), but this is the mirror of the backend rule, and the state
  // it guards — a shop no one can order from — is worth being certain of.
  if (!form.fulfillment.allows_delivery && !form.fulfillment.allows_pickup) {
    errors.fulfillment = "Offer delivery, pickup, or both — a shop can't turn off both.";
  }

  // numeric|min:0 server-side. Blank is caught here rather than sent: unlike
  // the text fields, "" can't clear this one — ConvertEmptyStringsToNull
  // would make it null and fail `numeric` — so the fix has to be named.
  const fee = form.delivery_fee.trim();
  if (!fee) {
    errors.delivery_fee = "Enter a delivery fee, or 0 if delivery is free.";
  } else if (!Number.isFinite(Number(fee))) {
    errors.delivery_fee = "Delivery fee must be a number.";
  } else if (Number(fee) < 0) {
    errors.delivery_fee = "Delivery fee can't be negative.";
  }

  return errors;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Laravel's 422 keys are the payload's own field names, so mapping is
 * mostly a lookup — except the nested ones, which are flattened to the
 * shape the two sub-editors already key their errors by
 * (business_hours.mon.1.close → hours["mon.1"], social_links.facebook →
 * social.facebook). Only the first message per field is shown.
 *
 * A key that can't be mapped onto a visible field is deliberately left out
 * rather than dropped somewhere invisible — unmapped means `hasErrors` stays
 * false for it, which is what lets the general banner surface the message.
 */
function toServerErrors(error: unknown): ShopProfileErrors {
  const errors = emptyErrors();
  if (!(error instanceof ApiError) || !error.errors) return errors;

  Object.entries(error.errors).forEach(([key, messages]) => {
    const message = messages[0];
    if (!message) return;

    // A file and its remove flag are validated as separate keys but are one
    // control here, so both land on the same field.
    if (key === "logo" || key === "remove_logo") {
      errors.logo = errors.logo ?? message;
      return;
    }
    if (key === "cover" || key === "remove_cover") {
      errors.cover = errors.cover ?? message;
      return;
    }

    // The backend reports the "at least one" rule on allows_delivery, but
    // accept either key: both describe the same pair of switches.
    if ((FULFILLMENT_OPTION_KEYS as readonly string[]).includes(key)) {
      errors.fulfillment = errors.fulfillment ?? message;
      return;
    }

    if (key === "timezone") {
      errors.timezone = errors.timezone ?? message;
      return;
    }

    if (key === "delivery_fee") {
      errors.delivery_fee = errors.delivery_fee ?? message;
      return;
    }

    if (key.startsWith("business_hours.")) {
      // "business_hours.mon.1.close" → "mon.1"; a whole-day rule like
      // "business_hours.mon" has no interval segment and stays "mon".
      const parts = key.split(".");
      const day = parts[1];
      const index = parts[2];
      if (!(BUSINESS_HOURS_DAYS as readonly string[]).includes(day)) return;
      const errorKey = index ? `${day}.${index}` : day;
      if (errors.hours[errorKey] === undefined) errors.hours[errorKey] = message;
      return;
    }

    if (key.startsWith("social_links.")) {
      const platform = key.split(".")[1] as SocialPlatform;
      if (!(SOCIAL_PLATFORMS as readonly string[]).includes(platform)) return;
      if (errors.social[platform] === undefined) errors.social[platform] = message;
      return;
    }

    if ((SHOP_DETAILS_KEYS as readonly string[]).includes(key)) {
      const field = key as ShopDetailsKey;
      if (errors.fields[field] === undefined) errors.fields[field] = message;
    }
  });

  return errors;
}

function businessHoursEqual(a: BusinessHours, b: BusinessHours): boolean {
  return BUSINESS_HOURS_DAYS.every((day) => {
    const left = a[day];
    const right = b[day];
    return (
      left.length === right.length &&
      left.every(
        (interval, i) => interval.open === right[i].open && interval.close === right[i].close,
      )
    );
  });
}

/**
 * The diff, and the reason this screen tracks a baseline at all: PATCH
 * /api/v1/tenant is genuinely partial — an absent field means "leave
 * unchanged", never "clear" — so sending the whole form back would be
 * harmless-looking but would overwrite fields another admin changed since
 * this page loaded.
 *
 * business_hours is the one exception: it's a whole-week replacement (all
 * seven keys required whenever it's sent at all), so it goes as a unit or
 * not at all.
 */
function buildPayload(
  form: ShopProfileFormState,
  baseline: ShopProfileFormState,
  logo: ShopImageFieldValue,
  cover: ShopImageFieldValue,
): UpdateTenantPayload {
  const payload: UpdateTenantPayload = {};

  const name = form.name.trim();
  if (name !== baseline.name) payload.name = name;

  // These three send "" when emptied — that's how a field is cleared over
  // multipart (ConvertEmptyStringsToNull turns it into a null server-side);
  // omitting the key would leave the old value in place instead.
  const address = form.address.trim();
  if (address !== baseline.address) payload.address = address;

  const businessPhone = form.business_phone.trim();
  if (businessPhone !== baseline.business_phone) payload.business_phone = businessPhone;

  const businessEmail = form.business_email.trim();
  if (businessEmail !== baseline.business_email) payload.business_email = businessEmail;

  if (!businessHoursEqual(form.business_hours, baseline.business_hours)) {
    payload.business_hours = form.business_hours;
  }

  // Per-platform: social_links: {facebook: ""} clears Facebook and leaves
  // the other five untouched, so only changed platforms are included.
  const social: Partial<Record<SocialPlatform, string>> = {};
  let socialChanged = false;
  SOCIAL_PLATFORMS.forEach((platform) => {
    const value = form.social_links[platform].trim();
    if (value === baseline.social_links[platform]) return;
    social[platform] = value;
    socialChanged = true;
  });
  if (socialChanged) payload.social_links = social;

  // Booleans, diffed one at a time like everything else: flipping pickup on
  // sends only allows_pickup, leaving delivery exactly as the server has it.
  FULFILLMENT_OPTION_KEYS.forEach((key) => {
    if (form.fulfillment[key] !== baseline.fulfillment[key]) {
      payload[key] = form.fulfillment[key];
    }
  });

  // Compared as numbers, not strings: the tenant resource returns "2000.00"
  // and a shop that retypes "2000" hasn't changed anything, so a string diff
  // would send a pointless write on every save.
  const deliveryFee = form.delivery_fee.trim();
  if (deliveryFee && Number(deliveryFee) !== Number(baseline.delivery_fee)) {
    payload.delivery_fee = deliveryFee;
  }

  if (form.timezone !== baseline.timezone) payload.timezone = form.timezone;

  // Never both — a file plus its remove flag is a 422. ShopImageField makes
  // that unrepresentable in its own state; this keeps it that way here too.
  if (logo.file) payload.logo = logo.file;
  else if (logo.remove) payload.remove_logo = true;

  if (cover.file) payload.cover = cover.file;
  else if (cover.remove) payload.remove_cover = true;

  return payload;
}

export function ShopProfileForm({ tenant }: { tenant: Tenant }) {
  const updateTenant = useUpdateTenant();

  const [form, setForm] = useState<ShopProfileFormState>(() => toFormState(tenant));
  // What the server had when this form was seeded — the thing every field is
  // diffed against so only real edits are sent.
  const [baseline, setBaseline] = useState<ShopProfileFormState>(() => toFormState(tenant));
  const [clientErrors, setClientErrors] = useState<ShopProfileErrors>(emptyErrors);
  const [logo, setLogo] = useState<ShopImageFieldValue>(NO_IMAGE_CHANGE);
  const [cover, setCover] = useState<ShopImageFieldValue>(NO_IMAGE_CHANGE);

  // Re-seeds only if the page is somehow showing a different tenant, never
  // on a plain refetch: React Query hands back a fresh object on every
  // background refetch (window refocus, or the invalidation this form's own
  // save fires), and re-seeding on those would wipe whatever the user had
  // typed. Same reasoning — and the same id comparison — as the product edit
  // screen. The trade-off is that a profile edited elsewhere mid-session
  // doesn't appear here until reload; protecting in-progress edits wins.
  const [seededTenantId, setSeededTenantId] = useState(tenant.id);
  if (tenant.id !== seededTenantId) {
    setSeededTenantId(tenant.id);
    const seeded = toFormState(tenant);
    setForm(seeded);
    setBaseline(seeded);
    setClientErrors(emptyErrors());
    setLogo(NO_IMAGE_CHANGE);
    setCover(NO_IMAGE_CHANGE);
  }

  // Server-side field errors describe the values that were submitted, so
  // they're stale the moment anything changes — cleared on the first edit
  // rather than left sitting under a corrected field. Client-side errors
  // stay until the next submit, as on the product screens.
  function clearServerError() {
    if (updateTenant.error) updateTenant.reset();
  }

  function updateDetailsField(key: ShopDetailsKey, value: string) {
    clearServerError();
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateBusinessHours(business_hours: BusinessHours) {
    clearServerError();
    setForm((prev) => ({ ...prev, business_hours }));
  }

  function updateTimezone(timezone: string) {
    clearServerError();
    setForm((prev) => ({ ...prev, timezone }));
  }

  function updateFulfillment(fulfillment: FulfillmentOptionsState) {
    clearServerError();
    setForm((prev) => ({ ...prev, fulfillment }));
  }

  function updateDeliveryFee(delivery_fee: string) {
    clearServerError();
    setForm((prev) => ({ ...prev, delivery_fee }));
  }

  function updateSocialLink(platform: SocialPlatform, value: string) {
    clearServerError();
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateTenant.reset();

    const validationErrors = validate(form);
    setClientErrors(validationErrors);
    if (hasErrors(validationErrors)) return;

    const payload = buildPayload(form, baseline, logo, cover);
    if (Object.keys(payload).length === 0) {
      toast("No changes to save.");
      return;
    }

    try {
      const updated = await updateTenant.mutateAsync(payload);
      // Re-seeding from the response (not from `form`) makes the baseline
      // exactly what the server now holds, so an immediate second save
      // sends nothing rather than resending the same values.
      const saved = toFormState(updated);
      setForm(saved);
      setBaseline(saved);
      setClientErrors(emptyErrors());
      setLogo(NO_IMAGE_CHANGE);
      setCover(NO_IMAGE_CHANGE);
      toast.success("Shop profile saved.");
    } catch {
      // Surfaced via the field errors and the banner below.
    }
  }

  const serverErrors = toServerErrors(updateTenant.error);
  const errors: ShopProfileErrors = {
    fields: { ...serverErrors.fields, ...clientErrors.fields },
    hours: { ...serverErrors.hours, ...clientErrors.hours },
    social: { ...serverErrors.social, ...clientErrors.social },
    logo: clientErrors.logo ?? serverErrors.logo,
    cover: clientErrors.cover ?? serverErrors.cover,
    fulfillment: clientErrors.fulfillment ?? serverErrors.fulfillment,
    timezone: clientErrors.timezone ?? serverErrors.timezone,
  };

  const generalError = (() => {
    if (!updateTenant.error) return null;
    if (!(updateTenant.error instanceof ApiError)) {
      return "Something went wrong. Please try again.";
    }
    // A validation error whose messages all landed on fields doesn't need a
    // banner repeating them; anything else (a 500, an unmapped 422 key) does.
    if (hasErrors(serverErrors)) return null;
    return updateTenant.error.message;
  })();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <SettingsSection
        title="Shop details"
        description="Shown to customers on your storefront."
      >
        <ShopDetailsForm
          form={form}
          errors={errors.fields}
          onFieldChange={updateDetailsField}
          slug={tenant.slug}
          currency={tenant.currency}
        />
      </SettingsSection>

      <SettingsSection
        title="Logo and cover"
        description="Replace or remove either one — the change applies when you save."
      >
        <ShopImageField
          label="Logo"
          hint="Square works best. JPG or PNG, up to 2MB."
          currentUrl={tenant.logo_url}
          value={logo}
          onChange={setLogo}
          error={errors.logo}
        />
        <ShopImageField
          label="Cover"
          hint="Wide banner across the top of your storefront. JPG or PNG, up to 2MB."
          currentUrl={tenant.cover_url}
          value={cover}
          onChange={setCover}
          shape="wide"
          error={errors.cover}
        />
      </SettingsSection>

      <SettingsSection
        title="Business hours"
        description="Untick a day to mark it closed. Add a second row for a split shift."
      >
        {/* Above the hours, not in "Shop details": these times are stored as
            wall-clock strings with no zone attached, so this is the field
            that says what they actually mean — to the storefront, and to any
            customer reading them from somewhere else. */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="shop-timezone" className="text-sm font-normal">
            Timezone
          </Label>
          <TimezoneSelect
            id="shop-timezone"
            value={form.timezone}
            onChange={updateTimezone}
            invalid={Boolean(errors.timezone)}
            triggerClassName="sm:w-72"
          />
          {errors.timezone ? (
            <span className="text-sm text-destructive">{errors.timezone}</span>
          ) : (
            <span className={typography.muted}>
              The hours below are {timezoneHoursLabel(form.timezone) ?? "in this zone"}.
            </span>
          )}
        </div>

        <BusinessHoursEditor
          value={form.business_hours}
          onChange={updateBusinessHours}
          errors={errors.hours}
        />
      </SettingsSection>

      <SettingsSection
        title="Fulfillment"
        description="How customers get their orders. This is what the checkout offers them."
      >
        <FulfillmentOptionsForm
          value={form.fulfillment}
          onChange={updateFulfillment}
          error={errors.fulfillment}
        />

        {/* Under the switches, because it only means anything while
            delivery is one of them — but still editable when delivery is
            off, so a shop can set the fee before turning it back on. */}
        <Label className="flex flex-col items-stretch gap-1">
          <span className="text-sm font-normal">Delivery fee</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={form.delivery_fee}
            onChange={(e) => updateDeliveryFee(e.target.value)}
            aria-invalid={errors.delivery_fee ? true : undefined}
            className={cn(controls.input, "sm:w-48")}
          />
          {errors.delivery_fee ? (
            <span className="text-sm text-destructive">{errors.delivery_fee}</span>
          ) : (
            <span className={typography.muted}>
              Charged on delivery orders only. Pickup is free. Set 0 to deliver for free.
            </span>
          )}
        </Label>
      </SettingsSection>

      <SettingsSection
        title="Social links"
        description="Leave a field empty to hide that link on your storefront."
      >
        <SocialLinksForm
          form={form.social_links}
          errors={errors.social}
          onFieldChange={updateSocialLink}
        />
      </SettingsSection>

      <div className="flex flex-col gap-3">
        {generalError && <ErrorState message={generalError} />}
        <Button type="submit" disabled={updateTenant.isPending} className={cn(controls.button, "w-fit")}>
          {updateTenant.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
