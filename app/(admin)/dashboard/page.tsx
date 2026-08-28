"use client";

import Link from "next/link";
import { Wallet, Receipt, AlertTriangle, Package, PackageCheck } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useTenant } from "@/lib/hooks/useTenant";
import { useDashboardSummary } from "@/lib/hooks/useDashboardSummary";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/admin/StatCard";
import { RecentOrdersTable } from "@/components/admin/RecentOrdersTable";
import { LowStockList } from "@/components/admin/LowStockList";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

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

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardPanelsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TableCard title="Recent orders">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Order</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="pr-4 text-right">Total</TableHead>
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
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
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
              <Link href="/products/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Add Product
              </Link>
              <Link href="/pos" className={buttonVariants({ size: "sm" })}>
                New Sale
              </Link>
            </>
          }
        />

        {error && <ErrorState message={error} />}

        {!error && isPending && (
          <div className="flex flex-col gap-6">
            <StatCardsSkeleton />
            <DashboardPanelsSkeleton />
          </div>
        )}

        {summary && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Today's sales"
                value={formatCurrency(summary.today_sales_total, currency)}
                icon={Wallet}
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
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TableCard title="Recent orders">
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

              <TableCard title="Low stock">
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
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
