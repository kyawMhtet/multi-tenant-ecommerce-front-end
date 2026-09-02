"use client";

import { useState } from "react";
import { Building2, CalendarClock, CreditCard, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { describePlanChange } from "@/lib/billing";
import type { BillingPlan, BillingRail, Subscription } from "@/lib/types";
import { controls, notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// Rail buttons. Rendered ONLY for rails present in the plan's own `rails`
// array — card is permanently absent for MMK shops because Stripe doesn't
// support the currency, so a hardcoded card button would be a dead button on
// every Myanmar shop's billing screen, not a styling choice.
const RAIL_BUTTONS: Record<
  string,
  { label: string; renewLabel: string; icon: typeof CreditCard }
> = {
  stripe: { label: "Pay by card", renewLabel: "Renew by card", icon: CreditCard },
  manual: { label: "Pay by bank transfer", renewLabel: "Renew by transfer", icon: Building2 },
};

interface PlanChangeDialogProps {
  plan: BillingPlan;
  plans: BillingPlan[];
  subscription: Subscription | null;
  rail: BillingRail;
  // Resolves once the subscribe call has settled — the dialog stays open and
  // disabled until then, so the shop isn't left looking at a dead button while
  // a redirect is being minted.
  onConfirm: () => Promise<void>;
  isPrimary: boolean;
  isBusy: boolean;
  isPending: boolean;
}

/**
 * The step between picking a plan and paying for it.
 *
 * It exists because plan changes no longer behave the same in both directions,
 * and the difference is invisible until it's too late:
 *
 *   - an UPGRADE bills from today at full price and forfeits whatever is left
 *     of the cheaper plan. A shop that upgrades on the 28th and silently loses
 *     three weeks has a genuine complaint.
 *   - a DOWNGRADE with paid time left is SCHEDULED. The shop keeps what it has
 *     until the period ends, which is the good outcome — but only if it knows,
 *     otherwise it clicks again the next day wondering why nothing happened.
 *
 * The wording comes from describePlanChange(), which accounts for the rail as
 * well as the direction: the card rail bills from now and never schedules
 * anything, so promising a future switch date there would be wrong.
 */
export function PlanChangeDialog({
  plan,
  plans,
  subscription,
  rail,
  onConfirm,
  isPrimary,
  isBusy,
  isPending,
}: PlanChangeDialogProps) {
  const [open, setOpen] = useState(false);

  const config = RAIL_BUTTONS[rail];
  const consequence = describePlanChange({ plans, subscription, plan, rail });

  async function handleConfirm() {
    await onConfirm();
    // Only after the call settles. Closing first would drop this dialog just
    // as the transfer-instructions one opens behind it, which reads as a flash
    // of nothing happening.
    setOpen(false);
  }

  if (!config) return null;
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            // The first rail listed is the primary action; a second is an
            // alternative, not a competing call to action.
            variant={isPrimary ? "default" : "outline"}
            disabled={isBusy}
            className={cn(controls.button, "w-full")}
          />
        }
      >
        <Icon className="size-4" />
        {isPending ? "Starting..." : plan.is_current ? config.renewLabel : config.label}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{consequence.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          {consequence.lines.map((line) => (
            <p key={line} className="text-pretty">
              {line}
            </p>
          ))}
        </div>

        {consequence.isScheduled && (
          <div className={cn(notice, noticeTone.accent)} role="status">
            <CalendarClock className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <p className="text-pretty">
              {/* The reassuring half, said plainly: a scheduled downgrade takes
                  nothing away today. */}
              Nothing changes today — you keep everything you have until then.
            </p>
          </div>
        )}

        {consequence.forfeitsPaidTime && (
          <div className={cn(notice, noticeTone.warning)} role="status">
            <TriangleAlert className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <p className="text-pretty">
              {/* Never buried in a paragraph. This is the one consequence a
                  shop would not guess, and the one it would be angriest to
                  find out about afterwards. */}
              <span className="font-semibold">
                The days left on your current plan aren&apos;t carried over.
              </span>{" "}
              The new period starts fresh, and there&apos;s no partial refund for
              the remainder.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
            className={controls.button}
          >
            Back
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            onClick={handleConfirm}
            className={controls.button}
          >
            {isPending ? "Starting..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
