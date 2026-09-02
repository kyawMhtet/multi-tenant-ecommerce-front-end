import type { StorefrontProductVariant } from "@/lib/types";

type StockStatus = StorefrontProductVariant["stock_status"];

/**
 * The wait a customer is agreeing to, in words. One place so the card, the
 * product page, the cart line and the checkout summary can't drift — the
 * whole point of preorder is that the same promise is visible everywhere
 * before they commit.
 *
 * A null lead time is not "unknown, guess something": the shop hasn't
 * committed to a date, so neither do we.
 */
export function preorderWaitText(leadTimeDays: number | null | undefined): string {
  if (leadTimeDays === null || leadTimeDays === undefined) {
    return "Ships when stock arrives";
  }
  // Guards a 0 or negative from the API reading as "Ships in about 0 days".
  if (leadTimeDays <= 0) return "Ships as soon as stock arrives";
  return `Ships in about ${leadTimeDays} ${leadTimeDays === 1 ? "day" : "days"}`;
}

/** Preorder is out of stock but orderable — only out_of_stock blocks a sale. */
export function isBuyable(status: StockStatus): boolean {
  return status !== "out_of_stock";
}

/**
 * One status for a whole product: the best any variant has. Preorder ranks
 * above out_of_stock (you can still order it) but below anything on the
 * shelf, so a product with one in-stock variant doesn't advertise a wait
 * that only applies to a different option.
 */
export function aggregateStockStatus(variants: StorefrontProductVariant[]): StockStatus {
  if (variants.some((v) => v.stock_status === "in_stock")) return "in_stock";
  if (variants.some((v) => v.stock_status === "low_stock")) return "low_stock";
  if (variants.some((v) => v.stock_status === "preorder")) return "preorder";
  return "out_of_stock";
}

/**
 * The lead time to advertise for a product whose only buyable options are
 * preorders.
 *
 * Takes the LONGEST of them, and only when every preorder variant has one:
 * a card can show a single number for a product whose options ship at
 * different times, and of the two ways to be wrong, telling someone it will
 * arrive sooner than it might is the one that turns into a complaint. Any
 * unknown among them collapses the whole thing to "ships when stock
 * arrives", since one uncommitted option can't be papered over with
 * another's date. The product page still shows the exact per-variant wait.
 */
export function aggregatePreorderLeadTime(
  variants: StorefrontProductVariant[],
): number | null {
  const leadTimes = variants
    .filter((v) => v.stock_status === "preorder")
    .map((v) => v.preorder_lead_time_days);

  if (leadTimes.length === 0 || leadTimes.some((days) => days === null)) return null;
  return Math.max(...(leadTimes as number[]));
}
