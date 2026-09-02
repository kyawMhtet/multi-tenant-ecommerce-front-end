import { platformApiFetch } from "@/lib/api-client";
import type { ApiResource, PaginatedResponse, PlatformInvoice } from "@/lib/types";

// The bank-transfer review queue. This is the manual rail's equivalent of a
// payment webhook — the only path by which a transfer becomes a paid plan —
// so both rulings below are consequential and neither is casually undoable.

/**
 * Transfers waiting on a human, 25 to a page.
 *
 * Includes invoices with NO proof uploaded, ordered after the ones that have
 * a screenshot. That's deliberate on the backend and must be preserved here:
 * a shop that asked for bank details and then went quiet is either a payment
 * that arrived without a screenshot or a shop that needs chasing, and hiding
 * those would make the queue look finished when it isn't.
 */
export function getPendingInvoices(page = 1): Promise<PaginatedResponse<PlatformInvoice>> {
  return platformApiFetch<PaginatedResponse<PlatformInvoice>>(
    `/api/v1/platform/billing/pending?page=${page}`,
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
