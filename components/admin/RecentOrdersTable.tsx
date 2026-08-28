import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { orderStatusClassName } from "@/lib/design-tokens";
import type { DashboardRecentOrder } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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
          <TableHead className="pl-4">Order</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
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
            <TableCell className="py-3.5 text-muted-foreground capitalize">{order.source}</TableCell>
            <TableCell className="py-3.5">
              <Badge variant="outline" className={orderStatusClassName[order.status] ?? ""}>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="py-3.5 text-muted-foreground">
              {dateFormatter.format(new Date(order.created_at))}
            </TableCell>
            <TableCell className="py-3.5 pr-4 text-right font-medium tabular-nums">
              {formatCurrency(order.total, currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
