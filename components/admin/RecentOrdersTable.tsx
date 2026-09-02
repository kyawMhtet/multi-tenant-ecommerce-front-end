import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { formatCurrency } from "@/lib/currency";
import { orderSourceLabel, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DashboardRecentOrder } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// Row padding, gutters and the header's small-caps treatment all come from
// the TableCard this sits in — see the density note there. Cells only carry
// what's specific to their column (alignment, weight, tabular figures).
export function RecentOrdersTable({
  orders,
  currency,
}: {
  orders: DashboardRecentOrder[];
  currency: string;
}) {
  return (
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
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">
              <Link
                href={`/orders/${order.id}`}
                className="transition-colors hover:text-primary"
              >
                {order.order_number}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {orderSourceLabel[order.source] ?? order.source}
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {dateFormatter.format(new Date(order.created_at))}
            </TableCell>
            <TableCell className={cn("text-right font-medium", typography.numeric)}>
              {formatCurrency(order.total, currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
