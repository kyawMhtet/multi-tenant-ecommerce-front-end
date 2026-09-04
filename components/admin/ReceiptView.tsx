import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCard } from "@/components/shared/TableCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderItemLabel } from "@/components/admin/OrderItemLabel";
import { formatQuantity } from "@/lib/currency";
import type { Order } from "@/lib/types";
import { controls, paymentStatusLabel } from "@/lib/design-tokens";

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ReceiptView({ order, onNewSale }: { order: Order; onNewSale: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Sale complete</h1>
          <p className="text-sm text-muted-foreground">
            Order {order.order_number} · Payment{" "}
            {paymentStatusLabel[order.payment_status] ?? order.payment_status}
          </p>
        </div>
      </div>

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="align-top font-medium">
                  <OrderItemLabel item={item} />
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {formatQuantity(item.quantity)}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {priceFormatter.format(Number(item.unit_price))}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {priceFormatter.format(Number(item.line_total))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{priceFormatter.format(Number(order.total))}</span>
      </div>

      <Button type="button" onClick={onNewSale} className={controls.button}>
        New sale
      </Button>
    </div>
  );
}
