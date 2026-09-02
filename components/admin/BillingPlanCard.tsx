"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanChangeDialog } from "@/components/admin/PlanChangeDialog";
import { featureLabel } from "@/lib/billing-error";
import { formatPlanLimit } from "@/lib/billing";
import { formatMoney } from "@/lib/currency";
import type { BillingPlan, BillingRail, Subscription } from "@/lib/types";
import { statusPill, surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface BillingPlanCardProps {
  plan: BillingPlan;
  // The full catalogue, for working out whether this plan is above or below
  // the current one — the API exposes no rank, but returns plans
  // cheapest-first, which is the ladder.
  plans: BillingPlan[];
  subscription: Subscription | null;
  onChoose: (rail: BillingRail) => Promise<void>;
  // Which rail on THIS card is mid-request, so only the button that was
  // clicked shows a spinner while the others simply disable.
  pendingRail: BillingRail | null;
  isBusy: boolean;
  // Set when no rail may be offered at all, whatever the plan lists — today
  // that means a live card subscription, which now blocks BOTH rails. Shown
  // in place of the buttons rather than as a disabled button, because there
  // is a real action to take first and it isn't on this card.
  blockedReason?: string;
}

export function BillingPlanCard({
  plan,
  plans,
  subscription,
  onChoose,
  pendingRail,
  isBusy,
  blockedReason,
}: BillingPlanCardProps) {
  return (
    <div
      className={cn(
        surface.panel,
        "flex flex-col gap-5 p-5",
        // The current plan is outlined rather than tinted — it's a statement
        // of fact, not the recommended choice.
        plan.is_current && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className={typography.sectionHeading}>{plan.label}</h3>
          <div className="flex items-center gap-2">
            {/* A queued downgrade names its destination on the card it's
                heading to, so the plan grid agrees with the status card above
                instead of showing Pro as current with no hint of the change. */}
            {subscription?.pending_plan === plan.code && (
              <Badge variant="outline" className={cn(statusPill, "text-muted-foreground")}>
                Scheduled
              </Badge>
            )}
            {plan.is_current && (
              <Badge variant="outline" className={cn(statusPill, "border-primary/40 text-primary")}>
                Current plan
              </Badge>
            )}
          </div>
        </div>

        <p className="flex items-baseline gap-1.5">
          {/* Priced in the SHOP's currency, which the server resolved from the
              shop's own — never the platform's. */}
          <span className={typography.metric}>{formatMoney(plan.amount, plan.currency)}</span>
          <span className={typography.muted}>/ month</span>
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
          {formatPlanLimit(plan.limits.products, "products")}
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
          {formatPlanLimit(plan.limits.staff, "staff accounts")}
        </li>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
            {featureLabel(feature)}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        {blockedReason ? (
          <p className={typography.muted}>{blockedReason}</p>
        ) : plan.rails.length === 0 ? (
          // Not a dead button and not a hidden plan: the shop can see what it
          // costs, it just can't self-serve payment for it in this currency
          // yet. Saying so is more useful than pretending the plan isn't there.
          <p className={typography.muted}>
            No payment option is set up for this plan in {plan.currency} yet — get in touch and
            we&apos;ll sort it out.
          </p>
        ) : (
          plan.rails.map((rail) => (
            <PlanChangeDialog
              key={rail}
              plan={plan}
              plans={plans}
              subscription={subscription}
              rail={rail}
              onConfirm={() => onChoose(rail)}
              isPrimary={rail === plan.rails[0]}
              isBusy={isBusy}
              isPending={pendingRail === rail}
            />
          ))
        )}
      </div>
    </div>
  );
}
