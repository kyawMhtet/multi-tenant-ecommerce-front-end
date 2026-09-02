import type { FulfillmentType, StorefrontProductVariant } from "@/lib/types";

type StockStatus = StorefrontProductVariant["stock_status"];

// localStorage is already origin-scoped, and every shop's storefront is its
// own subdomain ({slug}.host) — so this single key holds one cart per shop
// with no tenant namespacing needed.
export const CART_STORAGE_KEY = "storefront_cart";

// Everything the drawer needs to render a line without re-fetching the
// product. stockStatus is a best-effort snapshot from when the line was
// added — it goes stale, so it's a hint in the drawer, never a gate. Real
// availability is enforced by the checkout 422.
export interface CartLine {
  variantSlug: string;
  productName: string;
  variantLabel: string | null;
  // decimal string, same convention as the API's selling_price
  unitPrice: string;
  // The shop's ISO currency code, snapshotted alongside the price so the
  // drawer can label money without a second /public/shop request (the
  // product page deliberately never populates that query — see CLAUDE.md).
  // Every line in a cart is from the same shop: localStorage is
  // origin-scoped and each storefront is its own subdomain.
  currency: string | null;
  imageUrl: string | null;
  quantity: number;
  stockStatus: StockStatus;
  // Snapshotted alongside stockStatus so the drawer can repeat the wait the
  // customer was shown when they added the line, without refetching each
  // product. Null for anything that isn't a preorder.
  preorderLeadTimeDays: number | null;
  // Whether this preorder has to be paid up front — what removes cash-on-
  // delivery from checkout. Null for anything that isn't a preorder, and
  // also null on a line saved before this field existed, which is why
  // cartRequiresPrepayment() tests for `true` rather than truthiness: an
  // unknown must not be read as a demand for money the shop never made.
  // A stale snapshot is only ever advisory anyway — the server refuses cod
  // on a prepaid preorder with a 422 regardless of what the cart thinks.
  preorderRequiresPrepayment: boolean | null;
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.variantSlug === "string" &&
    typeof line.productName === "string" &&
    typeof line.unitPrice === "string" &&
    typeof line.quantity === "number" &&
    line.quantity > 0
  );
}

export function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // `currency`, `preorderLeadTimeDays` and `preorderRequiresPrepayment`
    // are deliberately not part of isCartLine: a cart saved before any of
    // them existed is still a perfectly good cart, so they're normalised to
    // null here rather than discarding the line. formatMoney falls back to a
    // bare number, a null lead time reads as "ships when stock arrives" — the
    // honest answer for a line whose wait we genuinely don't have — and a null
    // prepayment flag leaves cod on offer for the server to rule on.
    return parsed.filter(isCartLine).map((line) => ({
      ...line,
      currency: line.currency ?? null,
      preorderLeadTimeDays: line.preorderLeadTimeDays ?? null,
      preorderRequiresPrepayment: line.preorderRequiresPrepayment ?? null,
    }));
  } catch {
    return [];
  }
}

export function writeStoredCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage full or disabled — the in-memory cart still works this session
  }
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
}

/**
 * Whether this cart forces payment up front, i.e. holds at least one
 * preorder line the shop won't ship on credit. Checkout drops cash-on-
 * delivery from the payment list when it's true.
 *
 * One prepaid line is enough — the order ships as one parcel and settles as
 * one payment, so there is nothing to split. Tests for `true` explicitly:
 * null means "this line predates the field", not "no prepayment required".
 *
 * Advisory only. The server rejects cod on a prepaid preorder with a 422 no
 * matter what a stale snapshot here says — this exists so the customer
 * learns it while choosing rather than on the last tap.
 */
export function cartRequiresPrepayment(lines: CartLine[]): boolean {
  return lines.some((line) => line.preorderRequiresPrepayment === true);
}

/**
 * The delivery fee to display for a given fulfillment choice, as a number.
 *
 * Pickup is always 0 — the server forces it there, and a displayed total
 * that doesn't match what gets charged is the one failure mode this whole
 * line of code exists to prevent.
 *
 * An undecided choice (a shop offering both, before the customer picks)
 * bills as delivery: it's the higher of the two, so the total can only fall
 * once they choose, never rise after they've already read it.
 */
export function deliveryFeeFor(
  fulfillment: FulfillmentType | null,
  shopDeliveryFee: string | null | undefined,
): number {
  if (fulfillment === "pickup") return 0;
  const fee = Number(shopDeliveryFee);
  // Covers undefined (shop still loading), a malformed value, and a shop
  // that simply doesn't charge for delivery — all of which display as free
  // rather than as NaN.
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}
