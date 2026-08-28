"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  CircleDollarSign,
  Percent,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useTenant } from "@/lib/hooks/useTenant";
import { useSalesProfitReport } from "@/lib/hooks/useSalesProfitReport";
import type { SalesProfitReportParams } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatCard } from "@/components/admin/StatCard";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { SalesProfitChart } from "@/components/admin/SalesProfitChart";
import { OrderCountChart } from "@/components/admin/OrderCountChart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function ReportsPage() {
  const { data: tenant } = useTenant();
  const [params, setParams] = useState<SalesProfitReportParams>({});

  const { data: report, isPending, error: queryError } = useSalesProfitReport(params);

  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Something went wrong. Please try again."
    : null;

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

        {error && <ErrorState message={error} />}

        {!error && isPending && <ReportsSkeleton />}

        {report && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Revenue"
                value={formatCurrency(report.revenue, currency)}
                icon={Wallet}
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
              <TableCard title="Revenue, cost & profit">
                <div className="p-4">
                  <SalesProfitChart daily={report.daily} currency={currency} />
                </div>
              </TableCard>

              <TableCard title="Daily orders">
                <div className="p-4">
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
