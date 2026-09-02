"use client";

import { use } from "react";
import { Package, ReceiptText, ShoppingCart } from "lucide-react";
import { usePlatformShop } from "@/lib/hooks/usePlatformShop";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { TableCard } from "@/components/shared/TableCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { ShopOwnerPanel } from "@/components/platform/ShopOwnerPanel";
import { ShopSubscriptionPanel } from "@/components/platform/ShopSubscriptionPanel";
import { ShopFlagBadges } from "@/components/platform/ShopFlagBadges";
import { SuspendShopDialog } from "@/components/platform/SuspendShopDialog";
import { PlatformInvoiceTable } from "@/components/platform/PlatformInvoiceTable";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBillingDate } from "@/lib/billing";
import { notice, noticeTone, surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function ShopDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

/**
 * One shop, for the moment someone emails support.
 *
 * The order of the screen is the order of the questions: who are they (owner
 * contact, which is why this page exists), are they real (products and orders
 * counts — the fastest read on a business versus an abandoned signup), what
 * are they paying, and what have they paid.
 *
 * Two actions live here and no others: suspend/restore, and the billing
 * currency. There is deliberately NO is_active toggle — that is the fraud
 * hammer, it takes the storefront down and strands customers mid-order, and
 * exposing it beside a reversible suspension is how it gets used by mistake.
 */
export default function PlatformShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: shop, isPending, error } = usePlatformShop(id);

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-6">
        {error && (
          <>
            <PageHeader
              title="Shop"
              backHref="/platform/shops"
              backLabel="Back to shops"
            />
            <ApiErrorState error={error} fallback="Could not load this shop." />
          </>
        )}

        {!error && isPending && <ShopDetailSkeleton />}

        {shop && (
          <>
            <PageHeader
              title={shop.name}
              eyebrow={shop.slug}
              backHref="/platform/shops"
              backLabel="Back to shops"
              action={<SuspendShopDialog shop={shop} />}
            />

            <ShopFlagBadges shop={shop} />

            {shop.is_suspended && (
              // The reason is what the OWNER is shown on their 403, so it's
              // quoted here verbatim — this is the text someone will read back
              // to them on the phone.
              <div className={cn(notice, noticeTone.danger)} role="status">
                <div className="flex flex-col gap-1">
                  <p className="text-pretty">
                    <span className="font-semibold">
                      Suspended{formatBillingDate(shop.suspended_at)
                        ? ` on ${formatBillingDate(shop.suspended_at)}`
                        : ""}
                      :
                    </span>{" "}
                    {shop.suspension_reason ?? "No reason recorded."}
                  </p>
                  <p className="text-pretty opacity-90">
                    The owner can&apos;t reach their dashboard. Their storefront is still
                    online and customers can still place orders.
                  </p>
                </div>
              </div>
            )}

            {!shop.is_active && (
              // Read-only information. is_active is the hard kill switch and is
              // not settable from this console — see the note on this page.
              <div className={cn(notice, noticeTone.danger)} role="status">
                <p className="text-pretty">
                  <span className="font-semibold">This shop is deactivated.</span> Its
                  storefront is down as well as its dashboard. That switch isn&apos;t
                  settable from here — it strands customers mid-order, so it&apos;s changed
                  out of band.
                </p>
              </div>
            )}

            <ShopOwnerPanel shop={shop} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Products"
                value={shop.products_count != null ? String(shop.products_count) : "—"}
                icon={Package}
                tone="info"
                hint="A shop with none never finished setting up."
              />
              <StatCard
                label="Orders"
                value={shop.orders_count != null ? String(shop.orders_count) : "—"}
                icon={ShoppingCart}
                tone="success"
                hint="The quickest read on a real business."
              />
            </div>

            <ShopSubscriptionPanel shop={shop} />

            <TableCard
              title="Invoices"
              description="The 20 most recent charges raised against this shop."
            >
              {shop.invoices && shop.invoices.length > 0 ? (
                <PlatformInvoiceTable invoices={shop.invoices} showShop={false} />
              ) : (
                <EmptyState
                  icon={ReceiptText}
                  variant="inline"
                  title="No invoices"
                  description="Nothing has been raised against this shop yet."
                />
              )}
            </TableCard>

            <p className={cn(typography.muted, "text-balance")}>
              Looking for a specific payment? The{" "}
              <span className="font-medium text-foreground">ledger</span> filters every
              invoice on the platform by shop ID — this one is{" "}
              <span className="font-medium text-foreground tabular-nums">{shop.id}</span>.
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}
