import { ApiError } from "@/lib/api-client";

// Where every upgrade prompt sends the shop. One constant so a link can't
// drift from the route.
export const BILLING_PATH = "/settings/billing";

/**
 * A refusal that billing is responsible for, parsed out of an ApiError.
 *
 * Two kinds, and the difference is the whole reason the backend uses two
 * different status codes:
 *
 *   "upgrade"     — 402 Payment Required. The shop IS allowed to do this; it
 *                   simply hasn't paid. Actionable, so it gets a prompt with a
 *                   route to fix it. Deliberately NOT 403, which would say
 *                   "you may not" — wrong, and unactionable.
 *   "unavailable" — 422 with reason "billing_action_unavailable". Nothing here
 *                   is fixed by paying: the request itself doesn't apply (a
 *                   rail this deployment hasn't configured, or a plan change
 *                   that would collide with a live card subscription). Show
 *                   the message; an upgrade prompt would be nonsense.
 */
export type BillingRefusal =
  | { kind: "upgrade"; reason: "subscription_inactive"; message: string }
  | {
      kind: "upgrade";
      reason: "feature_not_on_plan";
      message: string;
      feature: string;
      currentPlan: string | null;
      currentPlanLabel: string | null;
    }
  | {
      kind: "upgrade";
      reason: "plan_limit_exceeded";
      message: string;
      limit: string;
      maximum: number | null;
      current: number | null;
      currentPlan: string | null;
      currentPlanLabel: string | null;
    }
  // Any 402 whose `reason` this app doesn't recognise yet. Deliberately still
  // an upgrade prompt: the status code alone is the backend's promise that
  // paying is what resolves it, so a reason added server-side later degrades
  // to a generic (but correct) prompt rather than to "something went wrong".
  | { kind: "upgrade"; reason: "unknown"; message: string }
  | { kind: "unavailable"; reason: "billing_action_unavailable"; message: string };

function readString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" ? value : null;
}

function readNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  return typeof value === "number" ? value : null;
}

/**
 * Turn any thrown value into a billing refusal, or null if it isn't one.
 *
 * A plain helper rather than a hook so it works identically in a toast
 * handler, a render path and a catch block — and so it stays outside the
 * components -> hooks -> api layering, which it isn't part of (it inspects an
 * error that has already been thrown; it makes no request).
 */
export function parseBillingError(error: unknown): BillingRefusal | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status !== 402 && error.status !== 422) return null;

  const body =
    error.body && typeof error.body === "object"
      ? (error.body as Record<string, unknown>)
      : {};
  const reason = readString(body, "reason");
  // Prefer the server's own wording: these messages are written for shop
  // owners and name specifics (the actual limit, the actual plan) that no
  // client-side copy could reproduce.
  const message = error.message;

  if (error.status === 422) {
    return reason === "billing_action_unavailable"
      ? { kind: "unavailable", reason, message }
      : null;
  }

  switch (reason) {
    case "subscription_inactive":
      return { kind: "upgrade", reason, message };
    case "feature_not_on_plan":
      return {
        kind: "upgrade",
        reason,
        message,
        feature: readString(body, "feature") ?? "",
        currentPlan: readString(body, "current_plan"),
        currentPlanLabel: readString(body, "current_plan_label"),
      };
    case "plan_limit_exceeded":
      return {
        kind: "upgrade",
        reason,
        message,
        limit: readString(body, "limit") ?? "",
        maximum: readNumber(body, "maximum"),
        current: readNumber(body, "current"),
        currentPlan: readString(body, "current_plan"),
        currentPlanLabel: readString(body, "current_plan_label"),
      };
    default:
      return { kind: "upgrade", reason: "unknown", message };
  }
}

// The PlanFeature enum's values, given shop-facing names. Falls back to
// humanising the raw code so a feature added server-side reads as
// "Something New" rather than "something_new" — the list is a nicety, not a
// gate, so it must not need updating in lockstep with the backend.
const FEATURE_LABELS: Record<string, string> = {
  card_payments: "Card payments",
  profit_reports: "Profit reports",
  preorder: "Preorders",
};

export function featureLabel(feature: string): string {
  if (FEATURE_LABELS[feature]) return FEATURE_LABELS[feature];
  const words = feature.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "This feature";
}

/**
 * Headline for a refusal. The server's `message` is the body text in every
 * case, so this only has to say what KIND of wall the shop just hit — short
 * enough to scan above a paragraph that already explains it.
 */
export function billingRefusalTitle(refusal: BillingRefusal): string {
  switch (refusal.reason) {
    case "subscription_inactive":
      return "Changes are paused";
    case "feature_not_on_plan":
      return `${featureLabel(refusal.feature)} isn't on your plan`;
    case "plan_limit_exceeded":
      return "You've reached your plan's limit";
    case "billing_action_unavailable":
      return "That payment option isn't available";
    default:
      return "Your plan doesn't cover this";
  }
}

/**
 * A single-line version for a toast, where there's no room for a title, a
 * body and a link. Returns null for anything that isn't a billing refusal so
 * callers can fall through to their own message.
 */
export function billingRefusalToast(error: unknown): string | null {
  const refusal = parseBillingError(error);
  if (!refusal) return null;
  return refusal.kind === "upgrade"
    ? `${refusal.message} See Settings → Billing to fix this.`
    : refusal.message;
}
