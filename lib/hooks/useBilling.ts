"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBilling } from "@/lib/api/billing";

// Stripe's webhook usually lands within a second or two of the shop being
// redirected back, so a short poll turns "refresh in a moment" into "it just
// updated" for the common case. Bounded hard: this is a courtesy, and a page
// left open must not keep asking forever.
const POLL_INTERVAL_MS = 2000;
const POLL_WINDOW_MS = 15000;

interface UseBillingOptions {
  // Set only on the Stripe return trip. It says "a confirmation is expected
  // shortly", NOT that one has happened — nothing about this flag may be read
  // as the payment having succeeded. Only the payload it re-reads says that.
  pollWhileConfirming?: boolean;
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
export function useBilling({ pollWhileConfirming = false }: UseBillingOptions = {}) {
  // Fixed at this observer's first render, so the window is measured from the
  // moment the shop landed back rather than sliding forward on every refetch.
  const [pollDeadline] = useState(() => Date.now() + POLL_WINDOW_MS);

  return useQuery({
    queryKey: ["billing"],
    queryFn: getBilling,
    refetchOnMount: "always",
    // Deliberately time-bounded rather than "stop once it looks confirmed".
    // There is no reliable client-side signal for that: a shop renewing a plan
    // it is already on produces no state change this could watch for, so any
    // early-exit condition would either never fire or fire on the wrong thing.
    // Giving up after a fixed window and leaving the notice's "refresh if it
    // still looks unchanged" copy in place is the honest version.
    refetchInterval: pollWhileConfirming
      ? () => (Date.now() < pollDeadline ? POLL_INTERVAL_MS : false)
      : false,
  });
}
