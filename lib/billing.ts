import { invoiceStatusClassName } from "@/lib/design-tokens";
import type { NoticeTone } from "@/lib/design-tokens";
import { formatMoney } from "@/lib/currency";
import type {
  BillingPlan,
  BillingRail,
  PlatformInvoice,
  Subscription,
  SubscriptionInvoice,
} from "@/lib/types";

// Presentation logic for billing state.
//
// THE RULE FOR THIS WHOLE FILE: read the server's derived booleans, never
// re-derive them from the dates sitting next to them. The API publishes
// is_read_only, is_in_grace, access_ends_at and grace_ends_at precisely so
// this app doesn't hold a second implementation of the grace rules — which
// differ by rail (7 days on card, 14 on transfer) and give a deliberate
// cancellation none at all. Two implementations of that is how a client ends
// up showing "active" over an account the API is already refusing.

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatBillingDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

export interface SubscriptionSummary {
  // Drives the banner's colour and whether it appears at all.
  tone: NoticeTone;
  // Short status word for a pill: "Active", "Trial", "Payment overdue".
  label: string;
  // One sentence saying what that means for the shop right now.
  detail: string;
  // Whether this state is worth interrupting the shop about on every screen.
  // Only true where something is either already broken or about to be.
  isUrgent: boolean;
  // Whether the app-wide banner appears at all. False only for a plainly
  // active subscription — a banner that's always on screen is a banner nobody
  // reads, which would cost exactly the state it exists to warn about.
  showBanner: boolean;
}

/**
 * The one place that turns a Subscription into words.
 *
 * Order of the branches is the whole design, and it follows severity rather
 * than the field order:
 *
 *   read-only  — writes are ALREADY blocked. Nothing else about the state
 *                matters more than that.
 *   grace      — past the paid period but STILL WORKING. The loudest warning
 *                the app has, because it's the only window in which the shop
 *                can fix this before anything stops.
 *   cancelling — leaving, but paid up until the period ends. A fact, not a
 *                fault.
 *   trial      — working, with a known end date.
 *   active     — nothing to say.
 *
 * Note what never appears: a downgrade. A lapsed Pro shop stays on Pro and
 * goes read-only; `plan_label` is quoted straight from the server, so this
 * cannot accidentally describe it as a Starter shop.
 */
export function summariseSubscription(subscription: Subscription | null): SubscriptionSummary {
  if (!subscription) {
    return {
      tone: "danger",
      label: "No subscription",
      detail:
        "We couldn't find a subscription for this shop. Choose a plan to start making changes again.",
      isUrgent: true,
      showBanner: true,
    };
  }

  const accessEnds = formatBillingDate(subscription.access_ends_at);
  const graceEnds = formatBillingDate(subscription.grace_ends_at);

  if (subscription.is_read_only) {
    return {
      tone: "danger",
      label: "Read-only",
      detail:
        // Says what still works, deliberately and first. A shop reading this
        // needs to know its storefront hasn't gone dark — it hasn't, and
        // neither have its orders or its POS.
        `Your ${subscription.plan_label} subscription has ended, so changes are paused. Your storefront, POS and orders all keep running — renew to start editing your catalogue again.`,
      isUrgent: true,
      showBanner: true,
    };
  }

  if (subscription.is_in_grace) {
    return {
      tone: "warning",
      label: "Payment overdue",
      detail: graceEnds
        ? `Your payment is overdue. Everything still works until ${graceEnds} — after that your shop becomes read-only.`
        : "Your payment is overdue. Everything still works for now, but your shop will become read-only soon.",
      isUrgent: true,
      showBanner: true,
    };
  }

  if (subscription.cancel_at_period_end || subscription.cancelled_at) {
    return {
      tone: "warning",
      label: "Cancelling",
      detail: accessEnds
        ? `Your subscription is cancelled. You keep full access to ${subscription.plan_label} until ${accessEnds} — pick a plan below to stay on.`
        : `Your subscription is cancelled. You keep the access you've already paid for.`,
      isUrgent: false,
      showBanner: true,
    };
  }

  if (subscription.is_on_trial) {
    return {
      tone: "accent",
      label: "Trial",
      detail: accessEnds
        ? `You're trialling ${subscription.plan_label} until ${accessEnds}. Choose a plan before then to keep everything you're using.`
        : `You're trialling ${subscription.plan_label}.`,
      isUrgent: false,
      // A 14-day trial that ends without warning is a shop that discovers
      // billing by hitting a wall. Quiet tone, but present.
      showBanner: true,
    };
  }

  return {
    tone: "accent",
    label: "Active",
    detail: accessEnds
      ? `You're on ${subscription.plan_label}. Your next payment is due ${accessEnds}.`
      : `You're on ${subscription.plan_label}.`,
    isUrgent: false,
    showBanner: false,
  };
}

/**
 * What an invoice's status means, in words a shop (or a reviewer) can act on.
 *
 * The pending split is the point of this function. A screenshot sitting on a
 * pending invoice is a CLAIM, and the two states read very differently to the
 * person looking at them: "we're checking" is not "we're waiting for you".
 * Neither of them is "paid", and no combination of proof_url and status can
 * produce that word except status === "paid" itself.
 */
export function invoiceStatusLabel(invoice: SubscriptionInvoice | PlatformInvoice): string {
  if (invoice.status === "paid") return "Paid";
  if (invoice.status === "failed") return "Rejected";
  // Not "cancelled" or "void": the shop didn't do anything wrong and nothing
  // was refused. It asked for a different plan before paying this one, so this
  // invoice was replaced. "Superseded" is the only word that says that without
  // implying a failure.
  if (invoice.status === "void") return "Superseded";
  if (invoice.status === "pending") {
    return invoice.proof_url ? "Awaiting review" : "Awaiting payment";
  }
  return invoice.status;
}

// The two states in which an invoice can still be paid — the client-side
// mirror of scopeUnpaid(). Used instead of blacklisting "paid" so that a
// status added server-side later is treated as unpayable until this app
// knows about it, rather than being offered an upload it will be refused for.
export function isInvoicePayable(invoice: SubscriptionInvoice): boolean {
  return invoice.status === "pending" || invoice.status === "failed";
}

export function invoiceStatusStyle(status: string): string {
  return invoiceStatusClassName[status] ?? "";
}

// "Up to 50 products" / "Unlimited products". null is unlimited, never zero —
// zero is a real answer to "how many may you create" and stays expressible.
export function formatPlanLimit(limit: number | null, noun: string): string {
  return limit === null ? `Unlimited ${noun}` : `Up to ${limit} ${noun}`;
}


// ---------------------------------------------------------------------------
// Changing plan
// ---------------------------------------------------------------------------

export type PlanChangeDirection = "renew" | "upgrade" | "downgrade";

/**
 * Where a plan sits on the ladder.
 *
 * Derived from the ORDER of data.plans, which the API returns cheapest-first
 * (PlanCatalog::rank does the same thing with the same array — declaration
 * order IS the ladder there, deliberately, because prices are per-currency and
 * could in principle cross over between markets while "Pro is above Starter"
 * holds everywhere).
 *
 * findIndex returning -1 for an unknown plan matches PlanCatalog::rank exactly:
 * a stale or missing plan ranks below everything, so it can only ever read as
 * an upgrade away from, never a downgrade into.
 */
function planRank(plans: BillingPlan[], code: string | null | undefined): number {
  return plans.findIndex((plan) => plan.code === code);
}

export function planChangeDirection(
  plans: BillingPlan[],
  currentPlan: string | null | undefined,
  targetPlan: string,
): PlanChangeDirection {
  const from = planRank(plans, currentPlan);
  const to = planRank(plans, targetPlan);

  if (to > from) return "upgrade";
  if (to < from) return "downgrade";
  return "renew";
}

/**
 * Whether the shop still has PAID days in hand.
 *
 * The one place in this file that reads a date instead of a server-derived
 * boolean, and it is deliberate. It mirrors one specific line —
 * SubscriptionReviewService::planChange()'s
 * `$subscription->current_period_ends_at?->isFuture()` — which is what decides
 * whether a downgrade is scheduled or applied at once, and the API publishes
 * no boolean for it.
 *
 * It must be current_period_ends_at and NOT access_ends_at: a trialing shop
 * has a future access_ends_at but no paid period, and the backend downgrades
 * it immediately. Reading access_ends_at here would promise a trialing shop a
 * scheduled change it isn't going to get.
 */
function hasPaidTimeLeft(subscription: Subscription | null): boolean {
  const endsAt = subscription?.current_period_ends_at;
  if (!endsAt) return false;
  const time = new Date(endsAt).getTime();
  return !Number.isNaN(time) && time > Date.now();
}

export interface PlanChangeConsequence {
  direction: PlanChangeDirection;
  title: string;
  // What actually happens, in order. One or two sentences — this is the last
  // thing the shop reads before committing money.
  lines: string[];
  // The change takes effect on a future date rather than now.
  isScheduled: boolean;
  // Unused days already paid for are lost. Called out separately because it's
  // the one consequence a shop would not guess and would be angry to discover
  // afterwards.
  forfeitsPaidTime: boolean;
}

/**
 * What the shop is about to agree to, stated before it commits.
 *
 * Direction is only half of it — the RAIL changes the answer, which is the
 * part that is easy to get wrong:
 *
 *   manual — the invoice is dated by ManualBillingRail. A renewal or downgrade
 *            counts from where paid access ends; an upgrade counts from today
 *            and forfeits the remainder. And a downgrade with paid time left
 *            is SCHEDULED rather than applied. Nothing happens at all until a
 *            human approves the transfer, so every line says so.
 *   stripe  — always immediate. The period comes from Stripe, and
 *            BillingWebhookProcessor sets `plan` directly and clears any
 *            pending change, so the card rail never schedules anything.
 *            Reachable only without a live card subscription, since one now
 *            blocks both rails.
 */
export function describePlanChange({
  plans,
  subscription,
  plan,
  rail,
}: {
  plans: BillingPlan[];
  subscription: Subscription | null;
  plan: BillingPlan;
  rail: BillingRail;
}): PlanChangeConsequence {
  const direction = planChangeDirection(plans, subscription?.plan, plan.code);
  const amount = formatMoney(plan.amount, plan.currency);
  const paidTimeLeft = hasPaidTimeLeft(subscription);
  const periodEnds = formatBillingDate(subscription?.current_period_ends_at ?? null);
  const currentLabel = subscription?.plan_label ?? "your current plan";

  // Card: one shape for every direction. Stripe bills from now, so there is no
  // future date to promise and nothing is ever queued.
  if (rail === "stripe") {
    return {
      direction,
      title:
        direction === "renew" ? `Renew ${plan.label}` : `Switch to ${plan.label}`,
      lines: [
        direction === "renew"
          ? `You'll be charged ${amount} and your ${plan.label} period restarts today.`
          : `You'll be charged ${amount} and move to ${plan.label} as soon as the payment goes through.`,
      ],
      isScheduled: false,
      // Stripe's new period starts now, so any remaining paid days go with it —
      // true for a downgrade as much as an upgrade on this rail.
      forfeitsPaidTime: paidTimeLeft && direction !== "renew",
    };
  }

  // Transfer: nothing takes effect until a human confirms it, so no line here
  // may be written in the present tense.
  const confirmed = "once we've confirmed your transfer";

  if (direction === "downgrade" && paidTimeLeft) {
    return {
      direction,
      title: `Move to ${plan.label} later`,
      lines: [
        periodEnds
          ? `You'll stay on ${currentLabel} until ${periodEnds}, then move to ${plan.label}.`
          : `You'll stay on ${currentLabel} until your current period ends, then move to ${plan.label}.`,
        `You'll be charged ${amount} for the ${plan.label} period starting then. Nothing changes until we've confirmed your transfer.`,
      ],
      isScheduled: true,
      // The whole point of scheduling it: the days already paid for are kept.
      forfeitsPaidTime: false,
    };
  }

  if (direction === "upgrade") {
    return {
      direction,
      title: `Upgrade to ${plan.label}`,
      lines: [
        `You'll be charged ${amount} and move to ${plan.label} ${confirmed}.`,
      ],
      isScheduled: false,
      forfeitsPaidTime: paidTimeLeft,
    };
  }

  if (direction === "renew") {
    return {
      direction,
      title: `Renew ${plan.label}`,
      lines: [
        paidTimeLeft && periodEnds
          ? `You'll be charged ${amount}. Your ${plan.label} plan carries on, extended from ${periodEnds} — you keep the days you've already paid for.`
          : `You'll be charged ${amount} and your ${plan.label} plan restarts ${confirmed}.`,
      ],
      isScheduled: false,
      forfeitsPaidTime: false,
    };
  }

  // Downgrade with nothing left to protect — a lapsed or trialing shop.
  return {
    direction,
    title: `Move to ${plan.label}`,
    lines: [`You'll be charged ${amount} and move to ${plan.label} ${confirmed}.`],
    isScheduled: false,
    forfeitsPaidTime: false,
  };
}

/**
 * The one-line version of an already-agreed change, for the status card:
 * "Pro until 14 Oct, then Starter".
 *
 * Returns null unless one is queued. The fields are absent (not null) in that
 * case, which is why this checks pending_plan_label rather than comparing to
 * the current plan.
 */
export function describeScheduledPlanChange(
  subscription: Subscription | null,
): string | null {
  if (!subscription?.pending_plan_label) return null;

  const startsAt = formatBillingDate(subscription.pending_plan_starts_at ?? null);

  return startsAt
    ? `You're on ${subscription.plan_label} until ${startsAt}, then you move to ${subscription.pending_plan_label}.`
    : `You're on ${subscription.plan_label} until your current period ends, then you move to ${subscription.pending_plan_label}.`;
}
