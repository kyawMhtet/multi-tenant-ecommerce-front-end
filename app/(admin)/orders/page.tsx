"use client";

import { useState } from "react";
import Link from "next/link";
import { Receipt, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useOrdersPage } from "@/lib/hooks/useOrdersPage";
import type { OrderFilterParams } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { TablePagination } from "@/components/shared/TablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { OrderFilterBar, type OrderStatusFilter, type OrderSourceFilter } from "@/components/admin/OrderFilterBar";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import {
  controls,
  orderSourceLabel,
  refundOwedClassName,
  statusPill,
  typography,
} from "@/lib/design-tokens";
import { PreorderBadge } from "@/components/admin/PreorderBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { DispatchBadge } from "@/components/admin/DispatchBadge";
import { cn } from "@/lib/utils";

const PER_PAGE_OPTIONS = [10, 25, 50] as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// Declared once so the skeleton and the loaded table can't disagree about
// the column set — see the same note on the products list.
const COLUMNS = ["Order", "Source", "Status", "Date", "Total"] as const;

function OrderTableHead() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNS.map((column, i) => (
          <TableHead key={column} className={i === COLUMNS.length - 1 ? "text-right" : undefined}>
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(PER_PAGE_OPTIONS[0]);

  const [status, setStatus] = useState<OrderStatusFilter>("all");
  const [source, setSource] = useState<OrderSourceFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters: OrderFilterParams = {
    ...(status !== "all" ? { status } : {}),
    ...(source !== "all" ? { source } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  };

  const hasActiveFilters = status !== "all" || source !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  // Changing a filter invalidates the current page. Render-phase adjustment
  // rather than an effect, for the same reason as the products list — see
  // the longer note there.
  const filterKey = JSON.stringify(filters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data: response, isPending, isFetching, error: queryError } = useOrdersPage(
    page,
    perPage,
    filters,
  );
  const orders = response?.data;
  const meta = response?.meta;

  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Something went wrong. Please try again."
    : null;

  function clearFilters() {
    setStatus("all");
    setSource("all");
    setDateFrom("");
    setDateTo("");
  }

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setPage(1);
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Orders"
          description={
            meta && meta.total > 0
              ? `${meta.total} ${meta.total === 1 ? "order" : "orders"} matching this view`
              : undefined
          }
        />

        <OrderFilterBar
          status={status}
          onStatusChange={setStatus}
          source={source}
          onSourceChange={setSource}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          isFetching={isFetching && !isPending}
          onClear={clearFilters}
          isFiltered={hasActiveFilters}
        />

        {error && <ErrorState message={error} />}

        {!error && isPending && (
          <TableCard>
            <Table>
              <OrderTableHead />
              <TableBody>
                <TableSkeleton columns={COLUMNS.length} />
              </TableBody>
            </Table>
          </TableCard>
        )}

        {orders !== undefined &&
          orders.length === 0 &&
          (hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title="No orders match your filters"
              description="Try widening the date range, or clear the filters to see every order."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className={controls.button}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No orders yet"
              description="Sales rung up in the POS and orders placed on your storefront will appear here."
            />
          ))}

        {orders !== undefined && orders.length > 0 && meta && (
          <TableCard
            footer={
              <TablePagination
                meta={meta}
                page={page}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={PER_PAGE_OPTIONS}
                label="orders"
              />
            }
          >
            <Table className={cn(isFetching && !isPending && "opacity-60 transition-opacity")}>
              <OrderTableHead />
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    {/* Who the order is for used to be its own column, mostly
                        holding an em dash for POS sales. As the order
                        number's second line it costs no width and reads as
                        what it is: an attribute of the order, not a
                        dimension you scan down. */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium transition-colors hover:text-primary"
                        >
                          {order.order_number}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {order.customer_name ?? order.cashier_name ?? "No customer recorded"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {orderSourceLabel[order.source] ?? order.source}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <OrderStatusBadge status={order.status} />
                        {/* An obligation, not a status — so it sits beside
                            "Cancelled" rather than replacing it. This list is
                            where a shop would notice one they'd forgotten. */}
                        {order.refund_required && !order.refunded_at && (
                          <Badge variant="secondary" className={cn(statusPill, refundOwedClassName)}>
                            Refund owed
                          </Badge>
                        )}
                        {/* Without this, a preorder sitting at "pending" for
                            three weeks is indistinguishable from one nobody
                            has picked up. */}
                        {order.has_preorder_items && <PreorderBadge />}
                        {/* A deposit landed, the balance hasn't. `status` stays
                            "pending" for it by design, so this column would
                            otherwise show a committed customer and a part-
                            collected sale as an order nothing has happened to. */}
                        {order.payment_status === "partial" && (
                          <PaymentStatusBadge status="partial" />
                        )}
                        {/* Same reasoning, other direction: a
                            cash-on-delivery order is dispatched while still
                            "pending", so neither the status nor the payment
                            state can tell you the parcel has already gone. */}
                        {order.is_dispatched && <DispatchBadge />}
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {dateFormatter.format(new Date(order.created_at))}
                    </TableCell>

                    <TableCell className={cn("text-right font-medium", typography.numeric)}>
                      {formatCurrency(order.total, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </div>
    </PageContainer>
  );
}
