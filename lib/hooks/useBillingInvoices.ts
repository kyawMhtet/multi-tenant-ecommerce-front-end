"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBillingInvoices } from "@/lib/api/billing";
import { isInvoicePayable } from "@/lib/billing";

// Slower than useBilling's Stripe-return burst, and for a different reason: a
// bank transfer is settled by a HUMAN reading a bank statement, so there is no
// few-second window to wait out — an approval can land in a minute or
// tomorrow. Same cadence as the notification bell, which is the app's
// established "no WebSocket infra yet" polling rate.
const REVIEW_POLL_INTERVAL_MS = 20_000;

/**
 * Payment history. The key starts with ["billing"] so anything that changes
 * the subscription — subscribing, uploading proof, cancelling — invalidates
 * this too through React Query's prefix matching, without each mutation having
 * to name both keys.
 *
 * Polls while it is holding an UNPAID invoice, because that is the one thing
 * on this screen that can change without the shop doing anything: platform
 * staff approve the transfer in their own console, in their own browser, and
 * nothing about that reaches this tab on its own. Without this, a shop that
 * has just been paid up sits looking at "Awaiting review" until it thinks to
 * reload.
 *
 * isInvoicePayable, not `status === "pending"`: a rejected invoice is still
 * unpaid and can still be approved after the shop re-uploads against it, so it
 * is equally something a reviewer might flip.
 *
 * Bounded three ways, so a forgotten tab can't poll forever: it stops the
 * moment nothing is payable, React Query only fires the timer while the window
 * is FOCUSED (refetchIntervalInBackground defaults off), and a page of history
 * with no unpaid rows on it never starts.
 */
export function useBillingInvoices(page: number) {
  return useQuery({
    queryKey: ["billing", "invoices", page],
    queryFn: () => getBillingInvoices(page),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.data.some(isInvoicePayable) ? REVIEW_POLL_INTERVAL_MS : false,
  });
}
