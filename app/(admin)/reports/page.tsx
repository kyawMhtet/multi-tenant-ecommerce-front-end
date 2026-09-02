"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  Bike,
  CircleDollarSign,
  Percent,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/useTenant";
import { useSalesProfitReport } from "@/lib/hooks/useSalesProfitReport";
import type { SalesProfitReportParams } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { StatCard } from "@/components/admin/StatCard";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { SalesProfitChart } from "@/components/admin/SalesProfitChart";
import { OrderCountChart } from "@/components/admin/OrderCountChart";
import { Skeleton } from "@/components/ui/skeleton";
import { surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

function formatMargin(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

function formatAverageOrderValue(value: string | null, currency: string): string {
  return value == null ? "—" : formatCurrency(value, currency);
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Mirrors StatCard's own layout (label row with its icon chip, then
          the metric) so nothing jumps when the real cards land. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export default function ReportsPage() {
  const { data: tenant } = useTenant();
  const [params, setParams] = useState<SalesProfitReportParams>({});

  const { data: report, isPending, error: queryError } = useSalesProfitReport(params);


  const currency = tenant?.currency ?? "USD";

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Reports"
          description="Sales and profit over time."
          action={
            <DateRangePicker
              dateFrom={params.date_from}
              dateTo={params.date_to}
              onApply={setParams}
            />
          }
        />

        {/* profit_reports is a plan feature, so this whole endpoint 402s for
            a Starter shop. That is the single clearest "here is what you'd be
            upgrading for" moment in the app, and it used to render as
            "Something went wrong." */}
        <ApiErrorState error={queryError} fallback="Something went wrong. Please try again." />

        {!queryError && isPending && <ReportsSkeleton />}

        {report && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* "Sales", not "Revenue" or "Total income": this figure is
                  GOODS ONLY. The backend moved delivery fees out of it
                  because most of a fee is handed to a courier and nothing
                  records what the courier was paid — counting it here, with
                  only goods in `cost`, overstated profit on every delivered
                  order. Money actually banked is this card plus the next. */}
              <StatCard
                label="Sales"
                value={formatCurrency(report.revenue, currency)}
                icon={Wallet}
                hint="Goods only — delivery is counted separately"
              />
              <StatCard
                label="Delivery fees"
                value={formatCurrency(report.delivery_fees_collected, currency)}
                icon={Bike}
                tone="muted"
                hint="Collected from customers, mostly paid out to couriers"
              />
              <StatCard
                label="Cost"
                value={formatCurrency(report.cost, currency)}
                icon={ArrowDownCircle}
                tone="warning"
              />
              <StatCard
                label="Profit"
                value={formatCurrency(report.profit, currency)}
                icon={TrendingUp}
                tone="success"
              />
              <StatCard
                label="Margin"
                value={formatMargin(report.margin_percentage)}
                icon={Percent}
                tone="violet"
              />
              <StatCard
                label="Orders"
                value={String(report.order_count)}
                icon={Receipt}
                tone="info"
              />
              <StatCard
                label="Avg. order value"
                value={formatAverageOrderValue(report.average_order_value, currency)}
                icon={CircleDollarSign}
                tone="rose"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TableCard title="Sales, cost & profit">
                <div className="p-5">
                  <SalesProfitChart daily={report.daily} currency={currency} />
                </div>
              </TableCard>

              <TableCard title="Daily orders">
                <div className="p-5">
                  <OrderCountChart daily={report.daily} />
                </div>
              </TableCard>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
