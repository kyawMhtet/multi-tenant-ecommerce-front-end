import { apiFetch } from "@/lib/api-client";
import {
  BUSINESS_HOURS_DAYS,
  type ApiResource,
  type Tenant,
  type UpdateTenantPayload,
} from "@/lib/types";

export function getTenant(): Promise<Tenant> {
  return apiFetch<ApiResource<Tenant>>("/api/v1/tenant").then((res) => res.data);
}

export function updateTenant(payload: UpdateTenantPayload): Promise<Tenant> {
  const formData = new FormData();
  // Method-spoofed PATCH: multipart can't ride a real PATCH reliably across
  // environments, so this POSTs with _method=PATCH — the same Laravel
  // convention updateProduct() uses, and what the endpoint expects.
  formData.append("_method", "PATCH");

  if (payload.name !== undefined) formData.append("name", payload.name);
  // Sent as-is including "": an empty value is how a text field is cleared
  // over multipart (see UpdateTenantPayload). Skipped entirely when
  // undefined, which is what leaves the stored value untouched.
  if (payload.address !== undefined) formData.append("address", payload.address);
  if (payload.business_phone !== undefined) {
    formData.append("business_phone", payload.business_phone);
  }
  if (payload.business_email !== undefined) {
    formData.append("business_email", payload.business_email);
  }

  // A file and its remove flag in the same request is a 422 server-side, so
  // the flag is only ever sent when no replacement file is — belt and
  // braces behind the UI, which already makes the two actions exclusive.
  if (payload.logo) {
    formData.append("logo", payload.logo);
  } else if (payload.remove_logo) {
    formData.append("remove_logo", "true");
  }
  if (payload.cover) {
    formData.append("cover", payload.cover);
  } else if (payload.remove_cover) {
    formData.append("remove_cover", "true");
  }

  if (payload.business_hours) {
    // Iterated over the canonical day list rather than Object.keys(), so a
    // caller that somehow assembled a partial week still sends all seven
    // keys — the backend rejects the field outright if any day is missing.
    BUSINESS_HOURS_DAYS.forEach((day) => {
      const intervals = payload.business_hours?.[day] ?? [];
      if (intervals.length === 0) {
        // An empty string, not an omitted key, is how "closed all day" is
        // encoded over multipart — there's no way to send an empty array.
        formData.append(`business_hours[${day}]`, "");
        return;
      }
      intervals.forEach((interval, i) => {
        formData.append(`business_hours[${day}][${i}][open]`, interval.open);
        formData.append(`business_hours[${day}][${i}][close]`, interval.close);
      });
    });
  }

  // "1"/"0" rather than "true"/"false": multipart carries strings only, and
  // these are the two Laravel's `boolean` rule accepts.
  if (payload.allows_delivery !== undefined) {
    formData.append("allows_delivery", payload.allows_delivery ? "1" : "0");
  }
  if (payload.allows_pickup !== undefined) {
    formData.append("allows_pickup", payload.allows_pickup ? "1" : "0");
  }

  if (payload.social_links) {
    // "" clears one platform (ConvertEmptyStringsToNull makes it a null
    // server-side) while leaving the rest untouched; undefined means "don't
    // touch this one at all", so those keys are skipped.
    Object.entries(payload.social_links).forEach(([platform, value]) => {
      if (value === undefined) return;
      formData.append(`social_links[${platform}]`, value ?? "");
    });
  }

  return apiFetch<ApiResource<Tenant>>("/api/v1/tenant", {
    method: "POST",
    body: formData,
  }).then((res) => res.data);
}
