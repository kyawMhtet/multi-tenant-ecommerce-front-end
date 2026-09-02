import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { BILLING_PATH, billingRefusalTitle, type BillingRefusal } from "@/lib/billing-error";
import { notice, noticeTone, type NoticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * What the shop sees instead of a generic error when the API refuses on
 * billing grounds.
 *
 * The point of the backend answering 402 rather than 403 is that this screen
 * can exist: "access denied" is a dead end, while "your plan doesn't include
 * this, here's where to change that" is a route forward. So every "upgrade"
 * refusal renders a link to the billing screen — which is deliberately
 * reachable even when the shop is read-only, since that's the state it most
 * needs to reach it from.
 *
 * A 422 billing_action_unavailable gets NO upgrade link: paying fixes
 * nothing there, and offering to take the shop's money for a request that
 * doesn't apply would be worse than saying nothing.
 */
export function BillingNotice({
  refusal,
  className,
}: {
  refusal: BillingRefusal;
  className?: string;
}) {
  const isUpgrade = refusal.kind === "upgrade";
  // A feature the plan never included is an OFFER — nothing has broken, the
  // shop just hasn't bought this. A lapsed subscription or an exhausted limit
  // is something that has already stopped working, so it warns instead.
  const isOffer = refusal.reason === "feature_not_on_plan";
  const tone: NoticeTone = isOffer ? "accent" : "warning";
  const Icon = isOffer ? Sparkles : AlertTriangle;

  return (
    <div className={cn(notice, noticeTone[tone], className)} role="status">
      <Icon className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">{billingRefusalTitle(refusal)}</p>
        {/* The server's wording, not ours: it names the actual limit, the
            actual plan and the actual currency, none of which this component
            can know — and it stays correct when pricing or limits change. */}
        <p className="text-pretty opacity-90">{refusal.message}</p>

        {isUpgrade && (
          <Link
            href={BILLING_PATH}
            className="group mt-1 inline-flex w-fit items-center gap-1.5 font-medium underline underline-offset-4"
          >
            View plans &amp; billing
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
