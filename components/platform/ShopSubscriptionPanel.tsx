import { Badge } from "@/components/ui/badge";
import { BillingCurrencyDialog } from "@/components/platform/BillingCurrencyDialog";
import { formatBillingDate } from "@/lib/billing";
import { describePendingPlan, railLabel, subscriptionStatusLabel } from "@/lib/platform-shops";
import type { PlatformShop } from "@/lib/types";
import {
  notice,
  noticeTone,
  statusPill,
  subscriptionStatusClassName,
  surface,
  typography,
} from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={typography.microLabel}>{label}</span>
      <span className="text-sm font-medium break-words">{children}</span>
    </div>
  );
}

/**
 * What this shop is paying us, and on what terms.
 *
 * Everything derived is quoted from the API, never recomputed: plan_label
 * rather than a plan inferred from what the shop can currently do (a lapsed
 * shop is NOT downgraded — it keeps its plan and goes read-only), and
 * is_in_grace / is_read_only rather than a comparison against the dates beside
 * them. Grace differs by rail and a cancellation gets none, so a second
 * implementation of those rules would eventually contradict the API this
 * console exists to trust. The flag badges above the panel carry those states;
 * this one carries the facts.
 */
export function ShopSubscriptionPanel({ shop }: { shop: PlatformShop }) {
  const subscription = shop.subscription;

  if (!subscription) {
    return (
      <div className={cn(surface.panel, "flex flex-col gap-4 p-5")}>
        <h2 className={typography.sectionHeading}>Subscription</h2>
        {/* Not a state registration can produce — a trial is opened in the same
            transaction as the shop — so this means a tenant created around the
            app. Worth naming rather than rendering as an empty panel. */}
        <p className={typography.muted}>
          This shop has no subscription row at all. It was created outside the normal signup,
          so there is nothing to bill and no plan to change. The billing currency can&apos;t
          be set until a subscription exists.
        </p>
      </div>
    );
  }

  const pending = describePendingPlan(subscription);

  return (
    <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={typography.sectionHeading}>Subscription</h2>
        <BillingCurrencyDialog shop={shop} subscription={subscription} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        <Fact label="Plan">{subscription.plan_label}</Fact>

        <Fact label="Status">
          <Badge
            variant="outline"
            className={cn(statusPill, subscriptionStatusClassName[subscription.status])}
          >
            {subscriptionStatusLabel(subscription.status)}
          </Badge>
        </Fact>

        <Fact label="Rail">{railLabel(subscription.rail)}</Fact>

        {/* Deliberately labelled "Billed in", never "Currency": the shop's
            selling currency is a different fact and lives on the owner panel
            as "Sells in". */}
        <Fact label="Billed in">{subscription.billing_currency}</Fact>

        <Fact label="Period ends">
          {formatBillingDate(subscription.current_period_ends_at) ?? "—"}
        </Fact>
      </div>

      {pending && (
        // A downgrade already agreed but not yet due. Only the manual rail ever
        // schedules one — a card payment applies its plan the moment the
        // webhook lands — so most shops never show this.
        <div className={cn(notice, noticeTone.accent)} role="note">
          <p className="text-pretty">
            <span className="font-semibold">Plan change scheduled:</span> {pending}. They keep
            everything on their current plan until then.
          </p>
        </div>
      )}
    </div>
  );
}
