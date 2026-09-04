import type { FulfillmentType, StorefrontProductVariant } from "@/lib/types";

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

/**
 * One deposit for a whole product, for the catalogue card.
 *
 * Takes the HIGHEST of its preorder variants, on the same principle as
 * aggregatePreorderLeadTime taking the longest wait: of the two ways to be
 * wrong on a card, quoting a smaller deposit than the customer will actually
 * be asked for is the one that turns into an abandoned checkout. The product
 * page still shows the exact figure for the option they pick.
 *
 * Null when nothing here is on preorder, and null when every preorder variant
 * asks for nothing — a card should say something only when there IS something
 * to say.
 */
export function aggregatePreorderDepositPercent(
  variants: StorefrontProductVariant[],
): number | null {
  const percents = variants
    .filter((v) => v.stock_status === "preorder")
    .map((v) => v.preorder_deposit_percent ?? 0);

  if (percents.length === 0) return null;

  const highest = Math.max(...percents);
  return highest > 0 ? highest : null;
}

/**
 * What a customer has to pay at the moment of ordering, in words.
 *
 * Lives here with preorderWaitText() and for the same reason: the panel, the
 * cart and the checkout summary must say the same thing, because finding out
 * at the payment step that half is due is the same surprise as finding out
 * about the wait after paying — which is the thing the whole preorder design
 * exists to prevent.
 *
 * Null for anything that asks for nothing up front, so a caller renders
 * nothing rather than "0% deposit". Null and 0 deliberately collapse to the
 * same answer HERE even though they mean different things upstream (not a
 * preorder line vs. a preorder with no deposit): neither owes money now.
 */
export function depositText(percent: number | null | undefined): string | null {
  if (percent === null || percent === undefined || percent <= 0) return null;
  // Not "100% deposit", which reads as a contradiction — a deposit is by
  // definition part of a price.
  if (percent >= 100) return "Paid in full up front";
  return `${percent}% deposit required`;
}

/**
 * What to call the money that isn't due yet. Pickup collects at the counter,
 * not from a driver, so the two can't share one word without one of them
 * being wrong.
 */
export function depositBalanceLabel(fulfillment: FulfillmentType | null): string {
  return fulfillment === "pickup" ? "On collection" : "On delivery";
}

/** The other half of that pair, so no caller has to invent it. */
export const DEPOSIT_DUE_NOW_LABEL = "Pay now";

/**
 * The same fact as depositText(), compressed to fit a badge on a catalogue
 * card. Separate rather than a truncation of it: "50% deposit required" is a
 * sentence for somewhere with room to explain, and a card has none — but the
 * two must still agree, which is why they live together.
 */
export function depositBadgeText(percent: number | null | undefined): string | null {
  if (percent === null || percent === undefined || percent <= 0) return null;
  return percent >= 100 ? "Prepaid" : `${percent}% deposit`;
}
