"use client";

import { useSearchParams } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { useBilling } from "@/lib/hooks/useBilling";
import { notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * What Stripe Checkout drops the shop back onto.
 *
 * StripeBillingRail sends them to /settings/billing?billing=success or
 * ?billing=cancelled (config/billing.php's return_path). Neither value is
 * evidence of anything: a success_url is just where the browser was pointed,
 * and it can be visited directly, bookmarked, or reached while the webhook
 * that actually grants the plan is still in flight. Only the webhook may move
 * a subscription.
 *
 * So this says "we're confirming" and nothing stronger, and the real answer
 * comes from the status card above it — useBilling() re-reads on every mount
 * precisely so that landing here shows server truth rather than an assumption
 * drawn from a query parameter.
 *
 * Reads useSearchParams, so the page mounts it inside its own <Suspense>
 * boundary (see the Next docs on prerendering behaviour for this hook).
 */
export function BillingReturnNotice() {
  const billing = useSearchParams().get("billing");
  const isReturningFromCheckout = billing === "success";

  // This component is the only thing on the page that knows a checkout return
  // just happened, so it owns the short poll that return implies. It
  // subscribes to the SAME ["billing"] query the status card already reads —
  // no second request, just a refetch interval on the shared entry — so the
  // card updates in place the moment the webhook lands, without this component
  // rendering any of that data or claiming anything about it.
  useBilling({ pollWhileConfirming: isReturningFromCheckout });

  if (billing === "cancelled") {
    return (
      <div className={cn(notice, noticeTone.warning)} role="status">
        <XCircle className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <p className="text-pretty">
          <span className="font-semibold">Checkout cancelled.</span> Nothing was charged and your
          plan is unchanged. Pick a plan below whenever you&apos;re ready.
        </p>
      </div>
    );
  }

  if (billing === "success") {
    return (
      <div className={cn(notice, noticeTone.accent)} role="status">
        <Clock className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <p className="text-pretty">
          <span className="font-semibold">Thanks — we&apos;re confirming your payment.</span>{" "}
          Card payments are confirmed by Stripe rather than by returning to this page, so your
          plan below updates as soon as that lands. It usually takes a few seconds; refresh if it
          still looks unchanged.
        </p>
      </div>
    );
  }

  return null;
}
