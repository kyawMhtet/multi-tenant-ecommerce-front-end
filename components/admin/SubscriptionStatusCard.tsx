import { AlertTriangle, CalendarClock, Sparkles } from "lucide-react";
import {
  summariseSubscription,
  formatBillingDate,
  describeScheduledPlanChange,
} from "@/lib/billing";
import { CancelSubscriptionDialog } from "@/components/admin/CancelSubscriptionDialog";
import { Badge } from "@/components/ui/badge";
import type { Subscription } from "@/lib/types";
import { notice, noticeTone, statusPill, surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// How the shop pays, in the shop's words. Only ever rendered from
// subscription.rail, which is null on a trial — a trial has no payment method
// yet, and printing "Card" there would assert one that may never exist.
const RAIL_LABELS: Record<string, string> = {
  stripe: "Card",
  manual: "Bank transfer",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={typography.microLabel}>{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/**
 * Where the shop stands right now: plan, status, how it pays, and when the
 * next thing happens.
 *
 * Everything here is quoted from the API. In particular `plan_label` is
 * printed as-is, which is what keeps the central invariant true — a lapsed Pro
 * shop is NOT downgraded, it stays on Pro and becomes read-only, so this card
 * must never describe it as a Starter shop. Deriving the plan from what the
 * shop can currently do would do exactly that.
 */
export function SubscriptionStatusCard({
  subscription,
}: {
  subscription: Subscription | null;
}) {
  const summary = summariseSubscription(subscription);
  const Icon = summary.tone === "accent" ? Sparkles : AlertTriangle;

  const accessEnds = formatBillingDate(subscription?.access_ends_at ?? null);
  const graceEnds = formatBillingDate(subscription?.grace_ends_at ?? null);
  const scheduledChange = describeScheduledPlanChange(subscription);

  return (
    <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className={typography.sectionHeading}>
            {subscription ? subscription.plan_label : "No plan"}
          </h2>
          <Badge variant="outline" className={cn(statusPill, "font-medium")}>
            {summary.label}
          </Badge>
        </div>
        {subscription && <CancelSubscriptionDialog subscription={subscription} />}
      </div>

      <div className={cn(notice, noticeTone[summary.tone])} role={summary.isUrgent ? "alert" : "status"}>
        <Icon className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <p className="text-pretty">{summary.detail}</p>
      </div>

      {/* Orthogonal to status, so it gets its own line rather than being folded
          into the summary above: a queued downgrade can sit alongside active,
          in-grace or cancelling all the same. A shop that doesn't know one is
          coming files a bug the day its reports disappear. */}
      {scheduledChange && (
        <div className={cn(notice, noticeTone.accent)} role="status">
          <CalendarClock className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          <p className="text-pretty">
            <span className="font-semibold">Plan change scheduled.</span> {scheduledChange}
          </p>
        </div>
      )}

      {subscription && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Fact
            label="Paying by"
            // Null is a real answer here, not missing data — it's what a trial
            // that hasn't chosen a rail looks like.
            value={
              subscription.rail
                ? (RAIL_LABELS[subscription.rail] ?? subscription.rail)
                : "Not set up yet"
            }
          />
          <Fact
            label={subscription.is_on_trial ? "Trial ends" : "Paid until"}
            value={accessEnds ?? "—"}
          />
          {/* Only while it's the live question. Outside grace this date is
              either in the past or hasn't been reached, and showing it would
              read as a second, contradictory deadline. */}
          {subscription.is_in_grace && (
            <Fact label="Read-only from" value={graceEnds ?? "—"} />
          )}
          <Fact
            label="Changes"
            value={subscription.is_read_only ? "Paused" : "Allowed"}
          />
        </div>
      )}
    </div>
  );
}
