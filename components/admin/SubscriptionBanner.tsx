"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { useBilling } from "@/lib/hooks/useBilling";
import { summariseSubscription } from "@/lib/billing";
import { BILLING_PATH } from "@/lib/billing-error";
import { notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * The shop's subscription state, on every admin screen that isn't billing.
 *
 * Renders straight from the API's derived flags — is_in_grace, is_read_only —
 * and never from the dates beside them. The grace state is the one this exists
 * for: the shop is past its paid period and EVERYTHING STILL WORKS, which is
 * exactly why it needs saying loudly and everywhere. By the time is_read_only
 * is true the warning has already failed.
 *
 * Failing quietly is deliberate. If the billing request itself errors, this
 * renders nothing: a hiccup reading subscription state must not put an error
 * strip across the top of the dashboard, the POS and every order screen.
 */
export function SubscriptionBanner() {
  const pathname = usePathname();
  const { data } = useBilling();

  // The billing screen shows all of this in full, with the plans underneath
  // it. A banner repeating it directly above would just push the actual fix
  // further down the page.
  if (pathname.startsWith(BILLING_PATH)) return null;
  if (!data) return null;

  const summary = summariseSubscription(data.subscription);
  if (!summary.showBanner) return null;

  const Icon = summary.tone === "accent" ? Sparkles : AlertTriangle;

  return (
    <div
      className={cn(
        notice,
        noticeTone[summary.tone],
        // Square top corners and a full-bleed edge: this is a property of the
        // whole app right now, not a card sitting inside one page's content.
        "items-start rounded-none border-x-0 border-t-0 px-4 sm:px-8 print:hidden",
      )}
      role={summary.isUrgent ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <p className="flex-1 text-pretty">
        <span className="font-semibold">{summary.label}.</span> {summary.detail}
      </p>
      <Link
        href={BILLING_PATH}
        className="group inline-flex shrink-0 items-center gap-1.5 font-medium whitespace-nowrap underline underline-offset-4"
      >
        {/* Never "Upgrade": a shop in grace is renewing what it already has,
            and a lapsed Pro shop is not being sold Pro a second time. */}
        Billing
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
