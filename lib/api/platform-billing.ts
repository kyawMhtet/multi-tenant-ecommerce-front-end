import { platformApiFetch } from "@/lib/api-client";
import type {
  ApiResource,
  BillingCurrency,
  PaginatedResponse,
  PlatformInvoice,
  PlatformInvoicesPageParams,
  PlatformSubscription,
} from "@/lib/types";

// The bank-transfer review queue. This is the manual rail's equivalent of a
// payment webhook — the only path by which a transfer becomes a paid plan —
// so both rulings below are consequential and neither is casually undoable.

/**
 * Transfers waiting on a human, 25 to a page, oldest first.
 *
 * Every row here has a screenshot attached — scopeAwaitingApproval() requires
 * proof_path, so this is a true queue: one decision per row. Proofless intents
 * used to be mixed in and are now their own list; see below.
 */
export function getPendingInvoices(page = 1): Promise<PaginatedResponse<PlatformInvoice>> {
  return platformApiFetch<PaginatedResponse<PlatformInvoice>>(
    `/api/v1/platform/billing/pending?page=${page}`,
  );
}

/**
 * Shops that asked how to pay and have sent nothing, oldest first.
 *
 * A chase list, not a queue: proof_url is always null, so there is nothing to
 * rule on. It is NOT read-only though — a shop that transfers and forgets to
 * upload is common on this rail, so a payment spotted on the bank statement
 * still has to be settleable from here.
 */
export function getAwaitingTransferInvoices(
  page = 1,
): Promise<PaginatedResponse<PlatformInvoice>> {
  return platformApiFetch<PaginatedResponse<PlatformInvoice>>(
    `/api/v1/platform/billing/awaiting-transfer?page=${page}`,
  );
}

/**
 * Confirm the money arrived and move the shop onto the plan it paid for.
 *
 * Idempotent server-side (the row is locked, then re-checked), so approving
 * twice is a no-op rather than a second month. The note is optional —
 * confirming that money arrived usually needs no explanation.
 */
export function approveInvoice(id: number, note?: string): Promise<PlatformInvoice> {
  return platformApiFetch<ApiResource<PlatformInvoice>>(
    `/api/v1/platform/billing/invoices/${id}/approve`,
    { method: "POST", body: JSON.stringify(note ? { note } : {}) },
  ).then((res) => res.data);
}

/**
 * The screenshot doesn't match what arrived, or nothing arrived.
 *
 * The reason is REQUIRED (5–500 chars server-side) and the shop reads it: told
 * only "rejected", they cannot act and will open a support ticket asking why.
 *
 * This leaves the invoice unpaid rather than voiding it, so the shop can
 * transfer again and re-upload against the same one. An already-paid invoice
 * is refused with a 422 — reversing a payment is a refund, not a rejection.
 */
export function rejectInvoice(id: number, reason: string): Promise<PlatformInvoice> {
  return platformApiFetch<ApiResource<PlatformInvoice>>(
    `/api/v1/platform/billing/invoices/${id}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) },
  ).then((res) => res.data);
}

/**
 * The full invoice ledger across every shop.
 *
 * Deliberately NOT the same thing as getPendingInvoices() above, and kept as a
 * second function rather than a filter on the first, because they answer
 * different questions: the queue is work waiting to be done (unpaid transfers,
 * actionable first, no filters), this is history you reconcile against a bank
 * statement (newest first, paid and void rows included). Folding one into the
 * other would bury the queue behind a filter nobody remembers to reset.
 *
 * `from`/`to` are compared with whereDate server-side, so both bounds are
 * INCLUSIVE of the whole day — a reviewer entering a month end means "up to and
 * including", not "up to midnight that morning".
 */
export function getPlatformInvoices(
  params: PlatformInvoicesPageParams = {},
): Promise<PaginatedResponse<PlatformInvoice>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.status) query.set("status", params.status);
  if (params.rail) query.set("rail", params.rail);
  if (params.currency) query.set("currency", params.currency);
  if (params.tenant_id !== undefined) query.set("tenant_id", String(params.tenant_id));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const qs = query.toString();

  return platformApiFetch<PaginatedResponse<PlatformInvoice>>(
    `/api/v1/platform/billing/invoices${qs ? `?${qs}` : ""}`,
  );
}

/**
 * Which currency a shop is billed in — the account it transfers to and which
 * price list applies. Staff-only because, left to the shop, it would be an
 * arbitrage lever rather than a preference: the ladders are not at parity
 * across currencies and the gap moves with FX.
 *
 * `null` is not "no billing currency" — it RESTORES the default of following
 * the shop's own selling currency, which is right for almost every shop. That
 * is why it is the reset value rather than an error, and why the UI has to
 * offer it as a real choice.
 *
 * Changing it VOIDS every pending manual invoice on the subscription (they
 * were raised in the old currency and can never be paid now), so this
 * invalidates the review queue as well as the ledger — see
 * useSetBillingCurrency.
 *
 * Takes a SUBSCRIPTION id, not a shop id. The only place one is ever
 * published is PlatformShopResource's subscription block, which is why this
 * endpoint was unreachable until the shop directory existed.
 */
export function setBillingCurrency(
  subscriptionId: number,
  currency: BillingCurrency | null,
): Promise<PlatformSubscription> {
  return platformApiFetch<ApiResource<PlatformSubscription>>(
    `/api/v1/platform/subscriptions/${subscriptionId}/billing-currency`,
    // `currency` is `present, nullable` server-side — the key must be sent
    // even when the value is null, so this can't be built conditionally.
    { method: "POST", body: JSON.stringify({ currency }) },
  ).then((res) => res.data);
}
