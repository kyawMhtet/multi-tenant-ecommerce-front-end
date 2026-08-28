import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  PaymentMethodConfig,
  PublicPaymentMethod,
  StripeStatus,
  UpsertPaymentMethodPayload,
} from "@/lib/types";

// Every method the platform supports, configured or not — the admin page
// renders this list directly rather than holding its own copy of "the
// methods we know about".
export function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  return apiFetch<ApiResource<PaymentMethodConfig[]>>("/api/v1/payments/methods").then(
    (res) => res.data,
  );
}

// multipart/form-data, not JSON — the QR is a real file, same reasoning as
// createProduct. An upsert: 201 when the row is new, 200 when it already
// existed, and nothing here needs to tell those apart.
//
// Returns void deliberately. The response body's envelope isn't something
// this app depends on: useUpsertPaymentMethod invalidates the list instead
// of threading the updated row back through, so there's no shape to guess
// at and get wrong.
export function upsertPaymentMethod(payload: UpsertPaymentMethodPayload): Promise<void> {
  const formData = new FormData();
  formData.append("method", payload.method);
  // Laravel's `boolean` rule over multipart wants "1"/"0", not a JS bool
  // stringified to "true"/"false".
  if (payload.is_enabled !== undefined) {
    formData.append("is_enabled", payload.is_enabled ? "1" : "0");
  }
  if (payload.sort_order !== undefined) {
    formData.append("sort_order", String(payload.sort_order));
  }
  // "" is what clears the field (ConvertEmptyStringsToNull makes it null),
  // so an omitted key and an empty one mean different things here — the same
  // partial-update rule as the tenant profile.
  if (payload.instructions !== undefined) {
    formData.append("instructions", payload.instructions ?? "");
  }
  // Never both: sending a file alongside remove_qr is a 422. PaymentMethodCard
  // holds these as one mutually-exclusive value so it can't happen.
  if (payload.qr) {
    formData.append("qr", payload.qr);
  } else if (payload.remove_qr) {
    formData.append("remove_qr", "1");
  }

  return apiFetch<void>("/api/v1/payments/methods", {
    method: "POST",
    body: formData,
  });
}

// The two Stripe endpoints are documented as returning bare objects rather
// than the `{ data: ... }` envelope the collection routes use. Both readers
// below accept either shape: it costs one line and means a backend that
// wraps them later doesn't break the Payments page.
function unwrap<T>(body: T | ApiResource<T>): T {
  return body && typeof body === "object" && "data" in body
    ? (body as ApiResource<T>).data
    : (body as T);
}

// `connected` alone doesn't mean cards can be charged — onboarding can be
// half-finished. charges_enabled is the flag that decides whether the card
// row offers an enable toggle or a "Connect Stripe" button.
export function getStripeStatus(): Promise<StripeStatus> {
  return apiFetch<StripeStatus | ApiResource<StripeStatus>>(
    "/api/v1/payments/stripe/status",
  ).then(unwrap);
}

// Returns the hosted onboarding URL to send the browser to. Coming back from
// it proves nothing — the caller re-checks getStripeStatus() on return.
export function createStripeOnboardingLink(): Promise<string> {
  return apiFetch<{ url?: string } | ApiResource<{ url?: string }>>(
    "/api/v1/payments/stripe/onboarding-link",
    { method: "POST" },
  ).then((body) => {
    const url = unwrap(body).url;
    if (!url) {
      throw new Error("Stripe did not return an onboarding link. Please try again.");
    }
    return url;
  });
}

// Unauthenticated, and scoped by X-Tenant-Slug the same way getPublicShop is
// — there's no slug in the path for the backend to resolve the tenant from,
// so the host-derived header is load-bearing here. Already filtered to
// enabled methods server-side; nothing to filter client-side.
export function getPublicPaymentMethods(): Promise<PublicPaymentMethod[]> {
  return apiFetch<ApiResource<PublicPaymentMethod[]>>("/api/v1/public/payment-methods").then(
    (res) => res.data,
  );
}
