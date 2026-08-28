"use client";

import { use } from "react";
import { Printer } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useOrder } from "@/lib/hooks/useOrder";
import { useTenant } from "@/lib/hooks/useTenant";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCard } from "@/components/shared/TableCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderReceiptPrint } from "@/components/admin/OrderReceiptPrint";
import { OrderItemLabel } from "@/components/admin/OrderItemLabel";
import { OrderPaymentPanel } from "@/components/admin/OrderPaymentPanel";
import { OrderFulfillmentPanel } from "@/components/admin/OrderFulfillmentPanel";
import { formatCurrency, formatQuantity } from "@/lib/currency";
import { orderStatusClassName } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="pr-4 text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableSkeleton columns={4} rows={3} />
          </TableBody>
        </Table>
      </TableCard>

      <div className="flex flex-col gap-1.5 self-end">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: order, error: queryError } = useOrder(id);
  const { data: tenant } = useTenant();

  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Could not load order."
    : null;

  if (error) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader title="Order" backHref="/orders" backLabel="Back to orders" />
          <ErrorState message={error} />
        </div>
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer size="lg">
        <OrderDetailSkeleton />
      </PageContainer>
    );
  }

  // Only a paid order has a receipt to print. Both halves of the swap are
  // gated on this together: gating just the receipt would leave Ctrl+P on
  // an unpaid order printing a blank sheet (everything else is print:hidden),
  // and gating neither would hand someone a receipt-shaped document for an
  // order that hasn't been paid for. Unpaid orders simply print the screen.
  const isPaid = order.status === "paid";

  return (
    <>
      <PageContainer size="lg" className={cn(isPaid && "print:hidden")}>
        <div className="flex flex-col gap-6">
          <PageHeader
            title={order.order_number}
            description={dateFormatter.format(new Date(order.created_at))}
            backHref="/orders"
            backLabel="Back to orders"
            action={
              <>
                <Badge variant="outline" className="capitalize">
                  {order.source}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("capitalize", orderStatusClassName[order.status])}
                >
                  {order.status}
                </Badge>
                {isPaid && (
                  <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer data-icon="inline-start" className="size-4" />
                    Print receipt
                  </Button>
                )}
              </>
            }
          />

          {(order.customer_name || order.cashier_name) && (
            <p className="text-sm text-muted-foreground">
              {order.customer_name
                ? `Customer: ${order.customer_name}${order.customer_phone ? ` · ${order.customer_phone}` : ""}`
                : `Cashier: ${order.cashier_name}`}
            </p>
          )}

          <OrderFulfillmentPanel order={order} />

          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-3.5 pl-4 align-top font-medium">
                      <OrderItemLabel item={item} />
                    </TableCell>
                    <TableCell className="py-3.5 text-right align-top tabular-nums">
                      {formatQuantity(item.quantity)}
                    </TableCell>
                    <TableCell className="py-3.5 text-right align-top tabular-nums">
                      {formatCurrency(item.unit_price, order.currency)}
                    </TableCell>
                    <TableCell className="py-3.5 pr-4 text-right align-top tabular-nums">
                      {formatCurrency(item.line_total, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>

          <div className="flex flex-col gap-1.5 self-end text-sm">
            <div className="flex justify-between gap-8 text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(order.subtotal, order.currency)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>Discount</span>
                <span className="tabular-nums">
                  -{formatCurrency(order.discount_amount, order.currency)}
                </span>
              </div>
            )}
            {Number(order.tax_amount) > 0 && (
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums">{formatCurrency(order.tax_amount, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between gap-8 border-t pt-1.5 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(order.total, order.currency)}</span>
            </div>
          </div>

          {/* Last, deliberately: the shop reads the order first, then sees
              what the customer sent and accepts it. The accept action lives
              here rather than on its own screen — the screenshot it's
              judged against is right above it. */}
          <OrderPaymentPanel order={order} />
        </div>
      </PageContainer>

      {/* Outside PageContainer on purpose: when printing, the receipt *is*
          the page, so it owns its own width and padding (globals.css zeroes
          the @page margin) rather than inheriting the screen layout's. */}
      {isPaid && (
        <div className="hidden print:block">
          <OrderReceiptPrint order={order} shopName={tenant?.name} />
        </div>
      )}
    </>
  );
}
