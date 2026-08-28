import { OrderItemLabel } from "@/components/admin/OrderItemLabel";
import { formatCurrency, formatQuantity } from "@/lib/currency";
import { initials } from "@/lib/initials";
import type { Order } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// Print-only receipt for a paid order — rendered alongside the normal order
// detail view (see app/(admin)/orders/[id]/page.tsx) but shown only to the
// print stylesheet. Deliberately excludes anything that isn't on the receipt
// itself (status/source badges, the back link, admin chrome): this is the
// one screen in the app a customer ends up holding, so it shouldn't carry
// the admin's internal workflow state.
//
// Supplies its own page padding because globals.css zeroes the @page margin
// to suppress the browser's header/footer — without this the sheet would
// print edge to edge.
export function OrderReceiptPrint({ order, shopName }: { order: Order; shopName?: string }) {
  // An order has a customer (online) or a cashier (POS), never both — see
  // Order's comment in lib/types.ts.
  const partyLabel = order.customer_name ? "Customer" : "Cashier";
  const partyName = order.customer_name ?? order.cashier_name;

  return (
    <article className="mx-auto max-w-lg px-10 py-12 text-foreground">
      <header className="flex flex-col items-center gap-3 text-center">
        {shopName && (
          // print-color-adjust keeps the brand square filled: browsers drop
          // background colors when printing unless a page opts back in, and
          // the mark is white-on-indigo — dropping the fill would leave the
          // initials invisible rather than merely unstyled.
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
            {initials(shopName)}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-semibold tracking-tight">{shopName ?? "Receipt"}</h2>
          <p className="text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Receipt
          </p>
        </div>
      </header>

      <dl className="mt-8 flex flex-col gap-2 border-y py-4 text-sm">
        <MetaRow label="Order" value={order.order_number} />
        <MetaRow label="Date" value={dateFormatter.format(new Date(order.created_at))} />
        {partyName && <MetaRow label={partyLabel} value={partyName} />}
        <div className="flex items-baseline justify-between gap-6">
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="font-medium capitalize">{order.payment_status}</dd>
        </div>
      </dl>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[0.7rem] tracking-wider text-muted-foreground uppercase">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 pl-4 text-right font-medium">Qty</th>
            <th className="pb-2 pl-4 text-right font-medium">Price</th>
            <th className="pb-2 pl-4 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-t align-top break-inside-avoid">
              <td className="py-2.5 pr-2">
                <OrderItemLabel item={item} />
              </td>
              <td className="py-2.5 pl-4 text-right tabular-nums">
                {formatQuantity(item.quantity)}
              </td>
              <td className="py-2.5 pl-4 text-right tabular-nums text-muted-foreground">
                {formatCurrency(item.unit_price, order.currency)}
              </td>
              <td className="py-2.5 pl-4 text-right font-medium tabular-nums">
                {formatCurrency(item.line_total, order.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex break-inside-avoid flex-col gap-2 border-t pt-5 text-sm">
        <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
        {Number(order.discount_amount) > 0 && (
          <SummaryRow
            label="Discount"
            value={`-${formatCurrency(order.discount_amount, order.currency)}`}
          />
        )}
        {Number(order.tax_amount) > 0 && (
          <SummaryRow label="Tax" value={formatCurrency(order.tax_amount, order.currency)} />
        )}
        <div className="mt-1 flex items-baseline justify-between gap-6 border-t pt-3">
          <span className="text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Total
          </span>
          <span className="text-xl font-semibold tabular-nums">
            {formatCurrency(order.total, order.currency)}
          </span>
        </div>
      </div>

      <footer className="mt-10 flex break-inside-avoid flex-col items-center gap-1 border-t pt-6 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">
          {shopName ? `Thank you for shopping at ${shopName}.` : "Thank you for your purchase."}
        </p>
        <p>Please keep this receipt for returns or exchanges.</p>
      </footer>
    </article>
  );
}
