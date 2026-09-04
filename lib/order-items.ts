import type { Order, OrderItem } from "@/lib/types";

// Attribute keys come from the shop's own variant setup ("size", "color"),
// not a fixed enum, so this only title-cases the first letter rather than
// mapping through a label dictionary that would silently drop unknown keys.
function attributeLabel(key: string): string {
  return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

// The secondary line that identifies *which* item was sold: the SKU staff
// use to pull it off the shelf, then any variant attributes ("Size: L").
//
// Everything here reads off the order item's own snapshot columns — never a
// live variant lookup. sku/attributes are frozen at sale time exactly like
// unit_price, so a later SKU reassignment must not rewrite what a past order
// says was sold (and product_variant_id is null once a variant is deleted,
// so there'd often be nothing to look up anyway).
//
// Returns "" when there is nothing to identify — a simple product with no
// SKU and no attributes — so callers can drop the whole line instead of
// rendering a stray separator.
export function orderItemIdentity(item: OrderItem): string {
  const parts: string[] = [];

  if (item.sku) parts.push(item.sku);

  if (item.attributes) {
    for (const [key, value] of Object.entries(item.attributes)) {
      parts.push(`${attributeLabel(key)}: ${value}`);
    }
  }

  return parts.join(" · ");
}

// The item's display name. variant_name is genuinely absent on most lines
// (39 of 51 in the seeded data), which is why it's appended to the product
// name rather than standing in as the identifier — that job belongs to
// orderItemIdentity.
export function orderItemName(item: OrderItem): string {
  return item.variant_name ? `${item.product_name} — ${item.variant_name}` : item.product_name;
}

// Whether an order's totals block should carry a Delivery line.
//
// Shown for every delivery order, INCLUDING a zero fee: "Delivery 0.00" is
// the shop telling the customer delivery was free, which is worth saying.
// Hidden for pickup and POS sales, where there is no fee to be free of, and
// for orders that predate the field entirely (delivery_fee is detail-only,
// so it's absent on the list endpoint rather than zero).
//
// Shared by the on-screen totals and the printed receipt: the fee is
// already inside `total`, so a receipt that omits the line has a subtotal
// and a total that visibly don't reconcile.
export function hasDeliveryLine(order: {
  fulfillment_type: string | null;
  delivery_fee?: string;
}): boolean {
  if (order.delivery_fee === undefined) return false;
  return order.fulfillment_type === "delivery" || Number(order.delivery_fee) > 0;
}

/**
 * How much has actually landed against this order.
 *
 * A deposit and its later balance are two payment rows against one order, so
 * this is a SUM, never a flag — the same arithmetic WebhookProcessor uses
 * server-side to decide whether an order is settled or merely part-paid.
 *
 * Returns NULL, not 0, when the payments aren't loaded: OrderResource only
 * includes them on GET /orders/{id}, and answering "nothing has been paid" for
 * an order this app simply hasn't asked about would put a wrong balance on
 * screen. Callers render the figure only when they have one.
 */
export function orderAmountPaid(order: Order): number | null {
  if (!order.payments) return null;

  const total = order.payments
    .filter((payment) => payment.status === "success")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return Number.isFinite(total) ? Math.round(total * 100) / 100 : null;
}

/** What the customer still owes — collected on delivery for a deposit order. */
export function orderBalanceDue(order: Order): number | null {
  const paid = orderAmountPaid(order);
  if (paid === null) return null;

  return Math.max(0, Math.round(((Number(order.total) || 0) - paid) * 100) / 100);
}
