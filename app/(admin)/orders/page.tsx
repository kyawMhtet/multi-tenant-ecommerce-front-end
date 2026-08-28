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
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { OrderFilterBar, type OrderStatusFilter, type OrderSourceFilter } from "@/components/admin/OrderFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import { orderStatusClassName } from "@/lib/design-tokens";
import { getPageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const PER_PAGE_OPTIONS = [10, 25, 50] as const;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

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

  function handlePerPageChange(value: string | null) {
    if (!value) return;
    setPerPage(Number(value));
    setPage(1);
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-6">
        <PageHeader title="Orders" />

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
        />

        {error && <ErrorState message={error} />}

        {!error && isPending && (
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer / Cashier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={6} />
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
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
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

        {orders !== undefined && orders.length > 0 && (
          <TableCard>
            <Table className={cn(isFetching && !isPending && "opacity-60 transition-opacity")}>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Customer / Cashier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="py-3.5 pl-4 font-medium">
                      <Link href={`/orders/${order.id}`} className="text-primary hover:underline">
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground capitalize">
                      {order.source}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="outline" className={cn("capitalize", orderStatusClassName[order.status])}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">
                      {order.customer_name ?? order.cashier_name ?? "—"}
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">
                      {dateFormatter.format(new Date(order.created_at))}
                    </TableCell>
                    <TableCell className="py-3.5 pr-4 text-right tabular-nums">
                      {formatCurrency(order.total, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}

        {meta && meta.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {meta.from}–{meta.to} of {meta.total}
              </span>
              <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                <SelectTrigger size="sm" className="w-27.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {meta.last_page > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                    />
                  </PaginationItem>

                  {getPageNumbers(page, meta.last_page).map((entry, i) =>
                    entry === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={entry}>
                        <PaginationLink
                          href="#"
                          isActive={entry === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(entry);
                          }}
                        >
                          {entry}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={page === meta.last_page}
                      className={page === meta.last_page ? "pointer-events-none opacity-50" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < meta.last_page) setPage(page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
