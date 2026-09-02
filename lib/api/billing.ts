import { apiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  BillingInitiation,
  BillingOverview,
  PaginatedResponse,
  StartSubscriptionPayload,
  Subscription,
  SubscriptionInvoice,
} from "@/lib/types";

// The shop's own subscription to THIS platform. Matches BillingController —
// verified directly against the Laravel source.
//
// None of these routes sits behind the 'subscription' middleware, which is
// load-bearing rather than an oversight: putting the renew button behind an
// active subscription is the one failure here a customer could not recover
// from on their own. So every function in this file keeps working for a
// lapsed, read-only shop.

// One call answers the whole billing screen: current state plus the full plan
// catalogue with prices and available rails. Deliberately returns the
// catalogue rather than just the current plan — a client holding its own copy
// of what plans exist is how a frontend ends up quoting a price the server no
// longer charges.
export function getBilling(): Promise<BillingOverview> {
  return apiFetch<ApiResource<BillingOverview>>("/api/v1/billing").then((res) => res.data);
}

// Paginated at 20/page server-side, with no per_page parameter — the page
// number is the only knob.
export function getBillingInvoices(
  page = 1,
): Promise<PaginatedResponse<SubscriptionInvoice>> {
  return apiFetch<PaginatedResponse<SubscriptionInvoice>>(
    `/api/v1/billing/invoices?page=${page}`,
  );
}

/**
 * Ask to start paying for a plan.
 *
 * 200, not 201, and it creates nothing the caller owns: it returns what to do
 * NEXT — a Stripe redirect, or bank details plus an invoice to reference.
 *
 * It does NOT change the plan, and callers must not act as though it did. The
 * redirect can be closed and the transfer may never be sent; the plan moves
 * only when money is confirmed, by webhook on the card rail and by a human on
 * the manual one.
 *
 * `rail` must be one the chosen plan actually offers (BillingPlan.rails) —
 * anything else is a 422 billing_action_unavailable, which is a "doesn't
 * apply" message rather than an upgrade prompt (see lib/billing-error.ts).
 */
export function startSubscription(
  payload: StartSubscriptionPayload,
): Promise<BillingInitiation> {
  return apiFetch<ApiResource<BillingInitiation>>("/api/v1/billing/subscribe", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

/**
 * Attach the shop's transfer screenshot to an invoice.
 *
 * multipart/form-data — `proof` is a real file, ruled 'image' and max 2MB
 * server-side. A plain POST, not the method-spoofed POST that PATCH /tenant
 * needs, because this route genuinely is a POST.
 *
 * THIS SETTLES NOTHING. The invoice comes back still 'pending' and the plan
 * does not move: the party uploading the screenshot is the party being
 * billed, so treating it as payment would let any shop grant itself a plan
 * with an image file. It exists so a human on the platform side can look.
 */
export function uploadInvoiceProof(
  invoiceId: number,
  proof: File,
): Promise<SubscriptionInvoice> {
  const formData = new FormData();
  formData.append("proof", proof);

  return apiFetch<ApiResource<SubscriptionInvoice>>(
    `/api/v1/billing/invoices/${invoiceId}/proof`,
    { method: "POST", body: formData },
  ).then((res) => res.data);
}

// Stops future charges and keeps every day already paid for — access runs to
// the end of the current period, which is why the returned subscription still
// reports an access_ends_at in the future. Idempotent server-side.
export function cancelSubscription(): Promise<Subscription> {
  return apiFetch<ApiResource<Subscription>>("/api/v1/billing/cancel", {
    method: "POST",
  }).then((res) => res.data);
}
