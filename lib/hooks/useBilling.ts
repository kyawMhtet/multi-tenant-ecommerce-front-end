"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBilling } from "@/lib/api/billing";

// Stripe's webhook usually lands within a second or two of the shop being
// redirected back, so a short poll turns "refresh in a moment" into "it just
// updated" for the common case. Bounded hard: this is a courtesy, and a page
// left open must not keep asking forever.
const CONFIRM_POLL_INTERVAL_MS = 2000;
const CONFIRM_POLL_WINDOW_MS = 15000;

// The manual rail's equivalent, and deliberately a different shape. A transfer
// is settled by a HUMAN reading a bank statement, so there is no few-second
// window to wait out — the answer may be a minute away or a day. Slower, and
// with no deadline: it ends when the caller stops asking, which is when
// nothing is unpaid any more.
const REVIEW_POLL_INTERVAL_MS = 20_000;

interface UseBillingOptions {
  // Set only on the Stripe return trip. It says "a confirmation is expected
  // shortly", NOT that one has happened — nothing about this flag may be read
  // as the payment having succeeded. Only the payload it re-reads says that.
  pollWhileConfirming?: boolean;
  // Set while the shop has an unpaid invoice sitting in front of platform
  // staff. Same disclaimer, more so: this says a ruling is POSSIBLE, not that
  // one has happened or that it will be an approval — it could equally come
  // back rejected. Only the payload says which.
  pollWhileAwaitingReview?: boolean;
}

/**
 * The shop's subscription state and the plan catalogue, in one request.
 *
 * refetchOnMount: "always" is the important setting here, and it exists for
 * the Stripe return trip. Checkout sends the owner back to /settings/billing
 * with ?billing=success, which is NOT proof of anything — the redirect can be
 * faked or the webhook can still be in flight. A cached payload would let the
 * screen assert a plan the server hasn't granted, so every mount re-reads the
 * real state and renders whatever comes back.
 *
 * Read by the billing screen, the app-wide banner and the return notice, so
 * it's one cache entry shared rather than a request per surface.
 */
export function useBilling({
  pollWhileConfirming = false,
  pollWhileAwaitingReview = false,
}: UseBillingOptions = {}) {
  // Fixed at this observer's first render, so the window is measured from the
  // moment the shop landed back rather than sliding forward on every refetch.
  const [pollDeadline] = useState(() => Date.now() + CONFIRM_POLL_WINDOW_MS);

  return useQuery({
    queryKey: ["billing"],
    queryFn: getBilling,
    refetchOnMount: "always",
    // The card burst is time-bounded rather than "stop once it looks
    // confirmed". There is no reliable client-side signal for that: a shop
    // renewing a plan it is already on produces no state change this could
    // watch for, so any early-exit condition would either never fire or fire
    // on the wrong thing. Giving up after a fixed window and leaving the
    // notice's "refresh if it still looks unchanged" copy in place is the
    // honest version.
    //
    // The review poll needs no deadline because it has a real exit condition
    // the card one lacks: its caller watches an invoice, and stops asking the
    // moment that invoice is no longer unpaid. React Query also only fires the
    // timer while the window is focused (refetchIntervalInBackground defaults
    // off), so a forgotten tab costs nothing.
    //
    // The card burst wins when both are on: it is faster and strictly
    // shorter-lived, so the slower one resumes on its own when it expires.
    refetchInterval: () => {
      if (pollWhileConfirming && Date.now() < pollDeadline) return CONFIRM_POLL_INTERVAL_MS;
      if (pollWhileAwaitingReview) return REVIEW_POLL_INTERVAL_MS;
      return false;
    },
  });
}
