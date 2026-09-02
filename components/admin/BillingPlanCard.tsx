"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanChangeDialog } from "@/components/admin/PlanChangeDialog";
import { featureLabel } from "@/lib/billing-error";
import { describeRailAvailability, formatPlanLimit } from "@/lib/billing";
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
  // What to say about the rails this plan isn't offering. `plan.rails` still
  // decides which buttons exist; this is only the words beside them.
  const railCopy = describeRailAvailability(plan);

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
          // costs, it just can't self-serve payment for it in this currency.
          // Saying so is more useful than pretending the plan isn't there.
          //
          // Two sentences at most, and they are not interchangeable. The
          // permanent one is a fact with nothing to do about it; the fixable
          // one is a thing we owe them, so only that one asks them to get in
          // touch. Telling a Kyat shop to get in touch about card payment
          // sends them to wait for something that cannot arrive.
          <>
            {railCopy.permanent && <p className={typography.muted}>{railCopy.permanent}</p>}
            {railCopy.fixable && <p className={typography.muted}>{railCopy.fixable}</p>}
          </>
        ) : (
          <>
            {plan.rails.map((rail) => (
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
            ))}

            {/* A quiet note under a real button, not a fallback in place of
                one. A Kyat shop offered only "Bank transfer" would otherwise be
                left wondering whether card is coming; one line answers it once
                and stops it becoming a support ticket.
                Deliberately only the PERMANENT reason — a shop that can already
                pay does not need to hear that the other rail is still being
                wired up. */}
            {railCopy.permanent && (
              <p className="text-xs text-muted-foreground text-pretty">{railCopy.permanent}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
