"use client";

import Link from "next/link";
import {
  Wallet,
  Bike,
  Receipt,
  AlertTriangle,
  Package,
  PackageCheck,
  Undo2,
  CalendarClock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useTenant } from "@/lib/hooks/useTenant";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import { useRole } from "@/lib/hooks/useRole";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { RecentOrdersTable } from "@/components/admin/RecentOrdersTable";
import { LowStockList } from "@/components/admin/LowStockList";
import { PreorderBacklogList } from "@/components/admin/PreorderBacklogList";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import { controls, surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Every panel header on this screen offers the same "go to the full list"
// affordance, so it's one component rather than three near-identical links.
function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={cn(surface.panel, "flex flex-col gap-4 p-5")}>
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="mt-1 h-3 w-20" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

function DashboardPanelsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TableCard title="Recent orders">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton columns={5} rows={4} />
            </TableBody>
          </Table>
        </TableCard>
      </div>

      <TableCard title="Low stock">
        <div className="flex flex-col divide-y">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </TableCard>
    </div>
  );
}

export default function DashboardPage() {
  const { data: tenant } = useTenant();
  const { canManage } = useRole();
  const { data: summary, isPending, error: queryError } = useDashboardSummary();

  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Something went wrong. Please try again."
    : null;

  const title = tenant ? `${getGreeting()}, ${tenant.name}` : getGreeting();
  const currency = tenant?.currency ?? "USD";

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={title}
          description={dateFormatter.format(new Date())}
          action={
            <>
              {canManage && (
                <Link
                  href="/products/new"
                  className={cn(buttonVariants({ variant: "outline" }), controls.button)}
                >
                  <Plus className="size-4" />
                  Add product
                </Link>
              )}
              <Link href="/pos" className={cn(buttonVariants(), controls.button)}>
                New sale
              </Link>
            </>
          }
        />

        {error && <ErrorState message={error} />}

        {!error && isPending && (
          <div className="flex flex-col gap-5">
            <StatCardsSkeleton />
            <DashboardPanelsSkeleton />
          </div>
        )}

        {summary && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Goods only. Delivery fees used to be inside this figure
                  and were split out server-side, because most of a fee goes
                  straight to a courier and nothing records what the courier
                  was paid — so counting it as sales overstated profit on
                  every delivered order. The two are shown side by side
                  rather than summed: a shop reconciling against the till
                  needs both halves, and only they know what the riders
                  cost. */}
              <StatCard
                label="Today's sales"
                value={formatCurrency(summary.today_sales_total, currency)}
                icon={Wallet}
                hint="Goods only — delivery shown separately"
              />
              <StatCard
                label="Today's delivery fees"
                value={formatCurrency(summary.today_delivery_fees, currency)}
                icon={Bike}
                tone="muted"
                hint="Charged to customers, mostly owed to couriers"
              />
              <StatCard
                label="Today's orders"
                value={String(summary.today_order_count)}
                icon={Receipt}
              />
              <StatCard
                label="Low stock"
                value={String(summary.low_stock_variant_count)}
                icon={AlertTriangle}
                tone="warning"
              />
              <StatCard
                label="Active products"
                value={String(summary.active_product_count)}
                icon={Package}
              />
              {/* Money owed back to customers on cancelled paid orders. It
                  exists nowhere else in the app — the platform never held
                  the money, so nothing else will ever remind the shop —
                  which is why it earns a card even when it reads zero. */}
              <StatCard
                label="Refunds owed"
                value={formatCurrency(summary.refunds_owed_total, currency)}
                icon={Undo2}
                tone={summary.refunds_owed_count > 0 ? "rose" : "default"}
                hint={
                  summary.refunds_owed_count === 1
                    ? "1 order awaiting refund"
                    : `${summary.refunds_owed_count} orders awaiting refund`
                }
              />
              {/* Its own card, never folded into low stock: the backend
                  excludes negative-stock variants from that count precisely
                  so these two never describe the same variant. Low stock
                  means reorder soon; this means customers are already
                  waiting. */}
              <StatCard
                label="On backorder"
                value={String(summary.preorder_backlog_units)}
                icon={CalendarClock}
                tone={summary.preorder_backlog_variant_count > 0 ? "violet" : "default"}
                hint={
                  summary.preorder_backlog_variant_count === 1
                    ? "units owed, across 1 variant"
                    : `units owed, across ${summary.preorder_backlog_variant_count} variants`
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TableCard
                  title="Recent orders"
                  description="The last few sales, from the POS and the storefront."
                  action={<PanelLink href="/orders">All orders</PanelLink>}
                >
                  {summary.recent_orders.length === 0 ? (
                    <EmptyState
                      variant="inline"
                      icon={Receipt}
                      title="No orders yet"
                      description="Your most recent sales will show up here."
                    />
                  ) : (
                    <RecentOrdersTable orders={summary.recent_orders} currency={currency} />
                  )}
                </TableCard>
              </div>

              <div className="flex flex-col gap-5">
                <TableCard
                  title="Low stock"
                  action={<PanelLink href="/products">All products</PanelLink>}
                >
                  {summary.low_stock_variants.length === 0 ? (
                    <EmptyState
                      variant="inline"
                      icon={PackageCheck}
                      title="Nothing is running low"
                      description="Variants at or below their low-stock threshold land here."
                    />
                  ) : (
                    <LowStockList variants={summary.low_stock_variants} />
                  )}
                </TableCard>

                {/* Only when there is a backlog, unlike low stock's standing
                    empty state: most shops never take a preorder, and an
                    empty panel every day would be noise rather than
                    reassurance. The card above still reports the zero. */}
                {summary.preorder_backlog_variants.length > 0 && (
                  <TableCard title="On backorder">
                    <PreorderBacklogList variants={summary.preorder_backlog_variants} />
                  </TableCard>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
