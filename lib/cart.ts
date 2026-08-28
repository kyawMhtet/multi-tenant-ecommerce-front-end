import type { StorefrontProductVariant } from "@/lib/types";

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
    // `currency` is deliberately not part of isCartLine: a cart saved before
    // that field existed is still a perfectly good cart, so it's normalised
    // to null here (formatMoney falls back to a bare number) rather than
    // discarding the line.
    return parsed
      .filter(isCartLine)
      .map((line) => ({ ...line, currency: line.currency ?? null }));
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
