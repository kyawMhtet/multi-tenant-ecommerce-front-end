import type { OrderItem } from "@/lib/types";

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
