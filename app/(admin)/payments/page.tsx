"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CreditCard, ExternalLink, Wallet } from "lucide-react";
import { billingRefusalToast, parseBillingError, BILLING_PATH } from "@/lib/billing-error";
import { useRole } from "@/lib/hooks/useRole";
import { usePaymentMethods } from "@/lib/hooks/usePaymentMethods";
import { useStripeStatus } from "@/lib/hooks/useStripeStatus";
import { useStripeOnboardingLink } from "@/lib/hooks/useStripeOnboardingLink";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { PaymentMethodCard } from "@/components/admin/PaymentMethodCard";
import { RoleRequiredNotice } from "@/components/admin/RoleRequiredNotice";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PaymentMethodConfig } from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function PaymentsSettingsPage() {
  const { isOwner } = useRole();
  const { data: methods, isPending, error: queryError } = usePaymentMethods({
    enabled: isOwner,
  });

  // Only fetched to answer "can this shop take card payments yet" — a shop
  // running cash + QR (most of them) never acts on it.
  const { data: stripeStatus, error: stripeError } = useStripeStatus({ enabled: isOwner });
  const onboardingLink = useStripeOnboardingLink();

  // A plan refusal on the Stripe read is not a Stripe problem — it means
  // card payments aren't on this shop's plan at all, so the card row offers
  // billing rather than a Connect button that would 402 on click.
  const stripeRefusal = parseBillingError(stripeError);

  async function handleConnectStripe() {
    onboardingLink.reset();
    try {
      const url = await onboardingLink.mutateAsync();
      // A full navigation, not a new tab: Stripe sends the shop back here
      // when it's done, and useStripeStatus refetches on mount to find out
      // whether it actually finished.
      window.location.href = url;
    } catch (err) {
      toast.error(
        billingRefusalToast(err) ?? "Could not start Stripe setup. Please try again.",
      );
    }
  }

  // A gateway method is only usable once its processor will actually accept
  // charges. `connected` isn't enough — onboarding can be abandoned halfway,
  // leaving an account that exists but can't take money.
  function blockedProps(method: PaymentMethodConfig) {
    if (method.is_manual || method.gateway !== "stripe") return {};
    if (stripeStatus?.charges_enabled) return {};

    // The plan case first: it's the only one where connecting Stripe isn't
    // the next step, so offering that button would be a dead end.
    if (stripeRefusal) {
      return {
        blockedReason: stripeRefusal.message,
        blockedAction: (
          <Link
            href={BILLING_PATH}
            className={cn(buttonVariants({ variant: "outline" }), controls.buttonSm)}
          >
            View plans
            <ArrowRight data-icon="inline-end" className="size-4" />
          </Link>
        ),
      };
    }

    const reason = stripeError
      ? "Couldn't check your Stripe account just now."
      : !stripeStatus?.connected
        ? "Connect a Stripe account to take card payments."
        : stripeStatus.details_submitted
          ? "Stripe is still reviewing your details."
          : "Your Stripe setup isn't finished yet.";

    return {
      blockedReason: reason,
      blockedAction: (
        <Button
          type="button"
          variant="outline"
          disabled={onboardingLink.isPending}
          onClick={handleConnectStripe}
          className={controls.buttonSm}
        >
          {onboardingLink.isPending
            ? "Opening..."
            : stripeStatus?.connected
              ? "Finish Stripe setup"
              : "Connect Stripe"}
          <ExternalLink data-icon="inline-end" className="size-4" />
        </Button>
      ),
    };
  }

  // sort_order is the shop's chosen checkout order; the API returns rows
  // already ordered, but sorting here keeps that true if it ever doesn't.
  const ordered = methods
    ? [...methods].sort((a, b) => a.sort_order - b.sort_order)
    : undefined;

  const enabledCount = ordered?.filter((m) => m.is_enabled).length ?? 0;

  if (!isOwner) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Payments"
            description="How customers pay you on your storefront."
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
          title="Payments"
          description="How customers pay you on your storefront. Turn on the ones you accept."
        />

        <ApiErrorState error={queryError} fallback="Could not load payment methods." />

        {!queryError && isPending && <LoadingState rows={4} />}

        {ordered && ordered.length === 0 && (
          <EmptyState
            icon={Wallet}
            title="No payment methods available"
            description="Your shop has no payment methods to configure yet."
          />
        )}

        {ordered && ordered.length > 0 && (
          <>
            {enabledCount === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No payment method is turned on, so customers can&apos;t check out on your
                storefront. Turn on at least one below.
              </p>
            )}

            <div className="flex flex-col gap-4">
              {ordered.map((method) => (
                <PaymentMethodCard
                  key={method.method}
                  method={method}
                  {...blockedProps(method)}
                />
              ))}
            </div>

            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              A payment screenshot from a customer is a claim, not confirmation. Orders stay
              unpaid until you accept them.
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}
