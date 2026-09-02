import { formatBillingDate } from "@/lib/billing";
import type {
  PlatformShop,
  PlatformShopSubscription,
  PlatformSubscriptionStatus,
} from "@/lib/types";

// Presentation logic for the staff-facing shop directory — the platform-side
// counterpart to lib/billing.ts, and it inherits that file's one rule: read
// the server's derived booleans (is_in_grace, is_read_only, is_suspended),
// never re-derive them from the dates sitting beside them. Grace differs by
// rail and a cancellation gets none, so a second implementation of those rules
// will eventually disagree with the API this console exists to trust.

// PlanCatalog::labelFor(), mirrored — needed because PlatformShopResource
// ships `plan_label` for the CURRENT plan but only a bare code for
// `pending_plan`. Falls back to capitalising the code so a plan added
// server-side reads as "Growth" rather than crashing or showing "growth".
const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
};

export function planLabel(code: string): string {
  return PLAN_LABELS[code] ?? (code ? code.charAt(0).toUpperCase() + code.slice(1) : "—");
}

// The staff vocabulary for subscriptions.status, which is deliberately blunter
// than the shop-facing wording in summariseSubscription(): a shop is told
// "Payment overdue" in a sentence explaining what still works, whereas a
// reviewer scanning 200 rows wants the column value they filtered by.
const STATUS_LABELS: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
};

export function subscriptionStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * A scheduled downgrade, in one line: "Pro → Starter on 14 Oct".
 *
 * Returns null unless one is queued. Only the manual rail ever schedules one —
 * a card payment applies its plan the moment the webhook lands — so most shops
 * have nothing here.
 */
export function describePendingPlan(
  subscription: PlatformShopSubscription | null | undefined,
): string | null {
  if (!subscription?.pending_plan) return null;

  const startsAt = formatBillingDate(subscription.pending_plan_starts_at);
  const target = planLabel(subscription.pending_plan);

  return startsAt
    ? `${subscription.plan_label} → ${target} on ${startsAt}`
    : `${subscription.plan_label} → ${target}`;
}

// A short flag on a shop row. `tone` keys into shopFlagClassName in
// lib/design-tokens.ts.
export interface ShopFlag {
  label: string;
  tone: "suspended" | "readOnly" | "grace" | "trial" | "inactive";
  // What it means, for the detail screen and for a title attribute in the
  // directory — every one of these is a state someone will have to explain to
  // a shop owner on the phone.
  detail: string;
}

/**
 * Everything about this shop that isn't its plan, in severity order.
 *
 * Only states worth a badge appear: a plainly active, unsuspended shop returns
 * an empty array, so a column of these reads as "the rows that need attention"
 * rather than a wall of pills.
 *
 * is_in_grace is here and NOT folded into the status column on purpose. It's
 * the one window in which the shop can still fix a lapse before anything
 * stops — by the time is_read_only is true, it's too late to be a warning.
 */
export function shopFlags(shop: PlatformShop): ShopFlag[] {
  const flags: ShopFlag[] = [];
  const subscription = shop.subscription;

  if (!shop.is_active) {
    flags.push({
      tone: "inactive",
      label: "Deactivated",
      detail:
        "The shop is switched off entirely — its storefront is down too. This is the hard kill switch, and it isn't settable from this console.",
    });
  }

  if (shop.is_suspended) {
    flags.push({
      tone: "suspended",
      label: "Suspended",
      detail:
        "The owner is locked out of their dashboard. Their storefront is still online and customers can still order.",
    });
  }

  if (subscription?.is_read_only) {
    flags.push({
      tone: "readOnly",
      label: "Read-only",
      detail:
        "Their subscription has lapsed, so catalogue and config changes are blocked. Orders, POS, fulfilment and the storefront all keep working.",
    });
  } else if (subscription?.is_in_grace) {
    flags.push({
      tone: "grace",
      label: "In grace",
      detail:
        "Payment is overdue but everything still works. This is the window to reach them — after it, the shop goes read-only.",
    });
  }

  if (subscription?.is_on_trial) {
    flags.push({
      tone: "trial",
      label: "Trialling",
      detail: "Still inside the free trial — they haven't paid for anything yet.",
    });
  }

  return flags;
}

// The directory's filter options, as fixed lists.
//
// Fixed rather than free text because an invalid value is a 422 server-side,
// not an empty page — deliberately, so a typo can't read as "no such shops".
// A select can't produce one; a text box eventually will.
export const SHOP_STATUS_OPTIONS: { value: PlatformSubscriptionStatus; label: string }[] = [
  { value: "trialing", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "cancelled", label: "Cancelled" },
];

export const RAIL_OPTIONS = [
  { value: "manual", label: "Bank transfer" },
  { value: "stripe", label: "Card" },
] as const;

export function railLabel(rail: string | null | undefined): string {
  if (rail === "manual") return "Bank transfer";
  if (rail === "stripe") return "Card";
  // Null on a trial, which has no payment method yet — saying "card" there
  // would assert a card that may never exist.
  return "—";
}
