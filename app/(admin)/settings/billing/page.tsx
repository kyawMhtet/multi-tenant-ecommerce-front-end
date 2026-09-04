"use client";

import { Suspense, useState } from "react";
import { toast } from "sonner";
import { useBilling } from "@/lib/hooks/useBilling";
import { useRole } from "@/lib/hooks/useRole";
import { useStartSubscription } from "@/lib/hooks/useStartSubscription";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { BillingReturnNotice } from "@/components/admin/BillingReturnNotice";
import { SubscriptionStatusCard } from "@/components/admin/SubscriptionStatusCard";
import { BillingPlanCard } from "@/components/admin/BillingPlanCard";
import { TransferInstructionsPanel } from "@/components/admin/TransferInstructionsPanel";
import { BillingInvoiceHistory } from "@/components/admin/BillingInvoiceHistory";
import { RoleRequiredNotice } from "@/components/admin/RoleRequiredNotice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingInitiation, BillingRail } from "@/lib/types";
import { formatBillingDate } from "@/lib/billing";
import { typography } from "@/lib/design-tokens";

/**
 * Billing — one GET /api/v1/billing answers the whole screen.
 *
 * Reachable, deliberately, from a read-only shop: the whole point of the
 * lapsed state is that the shop can still get itself out of it, and none of
 * the billing routes sit behind the write-access middleware.
 *
 * The rule this screen is built around: SUBSCRIBING IS NOT PAYING. The
 * subscribe call returns what to do next — a Stripe redirect or bank details —
 * and changes nothing about the plan. So nothing here announces a new plan on
 * success; the status card renders the server's subscription and only ever
 * that.
 */
export default function BillingPage() {
  const { isOwner } = useRole();
  const { data, isPending, error } = useBilling({ enabled: isOwner });
  const subscribe = useStartSubscription();

  // The transfer rail's answer, held so its bank details can be shown. Not
  // state about the subscription — it's an instruction sheet.
  const [transfer, setTransfer] = useState<BillingInitiation | null>(null);
  // Which plan+rail button is mid-flight, so only that one spins.
  const [pending, setPending] = useState<{ plan: string; rail: BillingRail } | null>(null);

  async function handleChoose(plan: string, rail: BillingRail) {
    subscribe.reset();
    setTransfer(null);
    setPending({ plan, rail });

    try {
      const initiation = await subscribe.mutateAsync({ plan, rail });

      const url = initiation.type === "redirect" ? initiation.url : null;

      if (url) {
        // A full navigation, not a new tab — Stripe sends the shop back to
        // this page, where useBilling re-reads the real state on mount.
        // `pending` is deliberately left set: the page is on its way out and
        // re-enabling the buttons would invite a second checkout session.
        //
        // assign() rather than `location.href = url`: identical behaviour, but
        // the React Compiler's immutability rule reads the assignment form as
        // mutating a value from outside the component and rejects it.
        window.location.assign(url);
        return;
      }

      if (initiation.type === "redirect") {
        toast.error("Couldn't open the card checkout. Please try again.");
      } else {
        setTransfer(initiation);
      }
    } catch {
      // Surfaced by ApiErrorState below — including a 422
      // billing_action_unavailable ("you already have an active card
      // subscription"), which is a plain message rather than an upgrade
      // prompt.
    }

    setPending(null);
  }

  const subscription = data?.subscription ?? null;

  // A live card subscription now blocks BOTH rails, not just a second
  // Checkout. Stripe would create a second subscription and charge twice a
  // month; a bank transfer is worse in a quieter way — approving it flips the
  // subscription to manual while Stripe carries on charging the card, and
  // nothing in this app would show the shop being billed twice.
  //
  // The server refuses it either way (422 billing_action_unavailable), so this
  // only spares the shop a click into a dead end. external_subscription_ref is
  // deliberately not published to clients, so this checks what is visible:
  // rail plus the two cancellation flags, exactly as the API's own guard does
  // minus that reference.
  const hasLiveCardSubscription =
    subscription?.rail === "stripe" &&
    !subscription.cancel_at_period_end &&
    subscription.status !== "cancelled";

  const cardAccessEnds = formatBillingDate(subscription?.access_ends_at ?? null);
  // Worded to cover both cards it lands on: on the CURRENT plan there is
  // genuinely nothing to do (Stripe renews it), and on any other the answer is
  // cancel first — which costs the shop nothing, and saying so is what stops
  // "cancel" reading as a threat.
  const liveCardSubscriptionNotice = hasLiveCardSubscription
    ? `Your card subscription renews automatically. To change plan, cancel it first — you keep ${
        cardAccessEnds ? `access until ${cardAccessEnds}` : "the period you've already paid for"
      }.`
    : undefined;

  if (!isOwner) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Billing"
            eyebrow="Settings"
            description="Your subscription to this platform."
            backHref="/dashboard"
            backLabel="Back to dashboard"
          />
          <RoleRequiredNotice minimum="owner" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Billing"
          eyebrow="Settings"
          description="Your subscription to this platform, and how you pay for it."
          backHref="/settings"
          backLabel="Back to settings"
        />

        {/* Its own boundary because it reads the query string — see the hook's
            prerendering note in the Next docs. */}
        <Suspense fallback={null}>
          <BillingReturnNotice />
        </Suspense>

        <ApiErrorState error={error} fallback="Could not load your billing details." />

        {!error && isPending && <LoadingState rows={6} />}

        {data && (
          <>
            <SubscriptionStatusCard subscription={data.subscription} />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className={typography.sectionHeading}>Plans</h2>
                <p className={typography.muted}>
                  {/* "billed in", not "trades in" — they are not always the
                      same. Billing resolves its currency from the shop's own,
                      but falls back to the platform default for one with no
                      billing entry (USD today), so a USD shop trades in
                      dollars and is billed in Baht. */}
                  Prices are in {data.currency}, the currency you&apos;ll be billed in.
                </p>
              </div>

              <ApiErrorState
                error={subscribe.error}
                fallback="Could not start that payment. Please try again."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.plans.map((plan) => (
                  <BillingPlanCard
                    key={plan.code}
                    plan={plan}
                    plans={data.plans}
                    subscription={data.subscription}
                    onChoose={(rail) => handleChoose(plan.code, rail)}
                    pendingRail={pending?.plan === plan.code ? pending.rail : null}
                    isBusy={pending !== null}
                    blockedReason={liveCardSubscriptionNotice}
                  />
                ))}
              </div>
            </div>

            <BillingInvoiceHistory />
          </>
        )}
      </div>

      {/* A dialog rather than an inline panel, so bank details can't appear
          below the fold on the click that produced them. Closing it loses
          nothing: choosing transfer again reuses the same unpaid invoice
          server-side and returns the same details, and the invoice keeps its
          upload control in the history table. */}
      <Dialog open={transfer !== null} onOpenChange={(open) => !open && setTransfer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Almost there</DialogTitle>
          </DialogHeader>
          {transfer && (
            <TransferInstructionsPanel
              instructions={transfer.instructions}
              invoice={transfer.invoice}
              className="border-0 bg-transparent p-0"
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
