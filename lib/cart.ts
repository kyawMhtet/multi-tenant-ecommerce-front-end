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
  // 0-100: what share of this line must be paid at the moment of ordering.
  // Null for anything that isn't a preorder, and also null on a line saved
  // before this field existed — which is why the checks below coalesce to 0
  // rather than treating an unknown as a demand for money the shop never
  // made. A stale snapshot is only ever advisory: the server refuses cod
  // against any deposit with a 422 regardless of what the cart thinks.
  preorderDepositPercent: number | null;
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
    // `currency`, `preorderLeadTimeDays` and `preorderDepositPercent` are
    // deliberately not part of isCartLine: a cart saved before any of them
    // existed is still a perfectly good cart, so they're normalised to null
    // here rather than discarding the line. formatMoney falls back to a bare
    // number, a null lead time reads as "ships when stock arrives" — the
    // honest answer for a line whose wait we genuinely don't have — and a null
    // deposit leaves cod on offer for the server to rule on.
    return parsed.filter(isCartLine).map((line) => ({
      ...line,
      currency: line.currency ?? null,
      preorderLeadTimeDays: line.preorderLeadTimeDays ?? null,
      preorderDepositPercent: line.preorderDepositPercent ?? null,
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
 * Whether this cart forces money up front, i.e. holds at least one preorder
 * line carrying a deposit. Checkout drops cash-on-delivery from the payment
 * list when it's true.
 *
 * ANY deposit counts, not just a 100% one: cash on delivery collects nothing
 * at the moment of ordering, so "half now" is exactly as impossible on it as
 * "all now". The percentage decides HOW MUCH is taken, never WHETHER the
 * method can take it — the same rule OrderService applies server-side.
 *
 * One such line is enough. The order ships as one parcel and settles under one
 * payment method, so there is nothing to split.
 *
 * Advisory only. The server rejects cod against a deposit with a 422 no matter
 * what a stale snapshot here says — this exists so the customer learns it
 * while choosing rather than on the last tap.
 */
export function cartRequiresPrepayment(lines: CartLine[]): boolean {
  return lines.some((line) => (line.preorderDepositPercent ?? 0) > 0);
}

/**
 * Two decimal places, matching PHP's round() rather than JS's.
 *
 * The intermediate toFixed is not decoration: Math.round(2.675 * 100) is 267,
 * because 2.675 is really 2.67499999999999982…, while PHP's round(2.675, 2)
 * pre-corrects that representation error and answers 2.68. Rounding the
 * scaled value through a fixed-precision string reproduces that, so the two
 * sides agree on the awkward cases as well as the easy ones.
 */
function roundMoney(value: number): number {
  return Math.round(Number((value * 100).toFixed(6))) / 100;
}

/**
 * What is payable NOW — the sum of each preorder line's deposit.
 *
 * Rounds PER LINE and then sums, because that is exactly what OrderService
 * does when it writes deposit_amount on each order item. Summing first and
 * rounding once is the obvious alternative and it can land a unit away from
 * what actually gets charged; a customer shown 334,000 and then charged
 * 334,001 has no reason to trust either number.
 *
 * Lines with no deposit contribute nothing, so a mixed cart returns only the
 * preorder part — which is the whole point of showing it: the rest is due on
 * delivery.
 */
export function cartDepositDue(lines: CartLine[]): number {
  return lines.reduce((sum, line) => {
    const percent = line.preorderDepositPercent ?? 0;
    if (percent <= 0) return sum;

    const lineTotal = Number(line.unitPrice) * line.quantity;
    if (!Number.isFinite(lineTotal)) return sum;

    return sum + roundMoney((lineTotal * percent) / 100);
  }, 0);
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
