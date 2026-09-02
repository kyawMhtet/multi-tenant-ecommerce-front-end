import { PreorderBadge } from "@/components/admin/PreorderBadge";
import { typography } from "@/lib/design-tokens";
import { orderItemIdentity, orderItemName } from "@/lib/order-items";
import { cn } from "@/lib/utils";
import type { OrderItem } from "@/lib/types";

// The "which item was sold" cell, shared by the order detail table, the POS
// receipt and the print receipt: the product name over the SKU/attributes
// snapshot staff actually match against the shelf.
//
// Renders cell *contents* only — no <td>/<TableCell> of its own — so it drops
// into the shadcn Table on screen and the print receipt's plain table alike,
// and inherits whatever font weight the surrounding cell sets. Hence the
// explicit font-normal on the second line: it has to stay quiet even inside
// a font-medium cell.
export function OrderItemLabel({ item }: { item: OrderItem }) {
  const identity = orderItemIdentity(item);

  return (
    <div className="flex flex-col gap-0.5">
      {/* Marked per line, never per order: a cart holding one item off the
          shelf and one on order is normal, and saying "preorder" over the
          whole thing would misdescribe the half that's ready now. The badge
          carries this line's own estimate when it has one. */}
      <span className="flex flex-wrap items-center gap-2">
        {orderItemName(item)}
        {item.is_preorder && <PreorderBadge leadTimeDays={item.preorder_lead_time_days} />}
      </span>
      {/* Dropped entirely when the item has neither a SKU nor attributes, so
          a simple product gets no blank second line. whitespace-normal
          because TableCell is nowrap by default and TableCard clips its
          overflow — a long attribute list has to wrap rather than vanish. */}
      {identity && (
        <span className={cn(typography.muted, "font-normal whitespace-normal")}>{identity}</span>
      )}
    </div>
  );
}
