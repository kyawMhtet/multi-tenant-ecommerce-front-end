import type { DiscountType, ProductVariant } from "@/lib/types";

/**
 * Per-variant promotions: the shop's timezone, the window's edges, and the
 * words for both. One place, because the variant editor, the variant row and
 * the products list all have to agree on when a promotion runs — and because
 * every one of the four ways to get this wrong is silent.
 *
 * Nothing here prices anything. effective_price / sale_price come off the
 * API already reduced, and the server prices the cart again when the order
 * is created; a figure this app worked out itself may be previewed but must
 * never be presented as the amount being charged.
 */

// --- The shop's clock ------------------------------------------------------
// Discount timestamps are UTC and shops are not: Yangon is UTC+6:30, Bangkok
// UTC+7. "Starts on the 5th" means midnight on the shop's clock, and treating
// a bare "2026-09-05" as UTC would start the promotion at half past six the
// previous evening.

/**
 * How far ahead of UTC `timeZone` is at that instant, in minutes.
 *
 * Formatting the instant INTO the zone and reading the wall clock back is the
 * only way to ask this without a timezone database — Intl already ships one,
 * and it handles DST (none in the zones this is sold in today, but Bangkok
 * being permanent is not a promise about the next zone a shop signs up from).
 */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    // h23, not hour12: false — the latter renders midnight as "24" in some
    // locales, which reads back as the next day.
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );

  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** "+06:30" / "-05:00" — what the offset looks like on the wire. */
function offsetSuffix(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * Midnight on `date` ("YYYY-MM-DD") in the shop's zone, as an ISO 8601 string
 * carrying that zone's offset — "2026-09-11T00:00:00+06:30".
 *
 * Sent with the offset rather than converted to UTC first: both name the same
 * instant, and the one that still says "the 11th" is the one a shop owner can
 * recognise in a support conversation.
 *
 * The offset is resolved twice because it's a chicken-and-egg: which offset
 * applies depends on the instant, which depends on the offset. The second
 * pass only ever differs across a DST boundary.
 */
export function shopMidnightIso(date: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day);

  const firstGuess = zoneOffsetMinutes(new Date(wallClock), timeZone);
  const offset = zoneOffsetMinutes(new Date(wallClock - firstGuess * 60000), timeZone);

  return `${date}T00:00:00${offsetSuffix(offset)}`;
}

/** The calendar date an instant falls on, on the shop's clock ("YYYY-MM-DD"). */
export function shopDate(iso: string, timeZone: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";

  // en-CA formats as YYYY-MM-DD, which is what <input type="date"> wants.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

/** A date the shop can read — "9 Sep 2026" — from either edge of the window. */
export function shopDateLabel(iso: string, timeZone: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

// --- The window's exclusive end -------------------------------------------
// The API's window is half-open, [starts, ends). A shop picking "until the
// 10th" means the 10th is the last day it runs, so the stored end is midnight
// on the ELEVENTH. Every conversion between the two lives in this pair, so
// nobody has to remember which side of the boundary they're on.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Last day the promotion runs ("YYYY-MM-DD") -> the exclusive end to send. */
export function lastDayToEndsAt(lastDay: string, timeZone: string): string {
  const [year, month, day] = lastDay.split("-").map(Number);
  // Stepped through a UTC instant purely to roll month and year ends over;
  // the shop's own offset is applied by shopMidnightIso on the way out.
  const dayAfter = new Date(Date.UTC(year, month - 1, day) + DAY_MS)
    .toISOString()
    .slice(0, 10);

  return shopMidnightIso(dayAfter, timeZone);
}

/**
 * The stored exclusive end -> the last day it runs, for the date field.
 *
 * A moment before the end is the last instant covered, so the date it falls
 * on is the last day — which is right whether or not the end sits exactly on
 * a midnight boundary (a promotion ending at 6pm still last runs that day).
 */
export function endsAtToLastDay(endsAt: string, timeZone: string): string {
  const parsed = new Date(endsAt);
  if (Number.isNaN(parsed.getTime())) return "";

  return shopDate(new Date(parsed.getTime() - 1).toISOString(), timeZone);
}

// --- What state a promotion is in ------------------------------------------

/**
 * The four states a variant's promotion can be in.
 *
 * "scheduled" is the one that needs saying out loud: a promotion whose window
 * hasn't opened has both dates filled in and discount_active: false, and a
 * badge driven off "has a discount_type" would advertise it as live weeks
 * early. Same trap in reverse for "ended".
 */
export type DiscountState = "none" | "active" | "scheduled" | "ended";

export type DiscountFields = Pick<
  ProductVariant,
  "discount_type" | "discount_value" | "discount_starts_at" | "discount_ends_at" | "discount_active"
>;

export function discountState(variant: DiscountFields): DiscountState {
  // A zero value is not a promotion whatever the type says — the same rule
  // ProductVariant::discountActive() applies server-side, so "0% off" can't
  // reach a badge from either end.
  if (variant.discount_type === null || Number(variant.discount_value) <= 0) return "none";
  if (variant.discount_active) return "active";

  const now = Date.now();
  if (variant.discount_starts_at && new Date(variant.discount_starts_at).getTime() > now) {
    return "scheduled";
  }
  // Not active, not waiting to start: the window closed. (Both dates absent
  // would be permanently live, so discount_active would have been true.)
  return "ended";
}

/** Whether the list price is struck through and a reduced figure shown. */
export function isOnSale(variant: DiscountFields): boolean {
  return discountState(variant) === "active";
}

// --- Words -----------------------------------------------------------------

/**
 * The promotion itself, in the shop's terms — "20% off", "1,500 off".
 *
 * The unit follows the TYPE and nothing else, which is the whole reason this
 * isn't formatted at each call site: a percent value rendered as money (or the
 * reverse) is wrong by a factor of the price and looks perfectly plausible.
 */
export function discountValueLabel(
  type: DiscountType,
  value: string | number,
  currency?: string | null,
): string {
  const amount = Number(value);
  if (type === "percent") {
    // Trailing ".00" on a percentage reads as false precision; on money it's
    // the convention this app uses everywhere.
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)}% off`;
  }

  const money = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return currency ? `${money} ${currency} off` : `${money} off`;
}

/**
 * The window in words — "until 10 Sep 2026", "from 5 Sep 2026", "no end date".
 *
 * Both edges are rendered on the shop's clock and the end is rendered as the
 * LAST DAY IT RUNS, never as the exclusive boundary that's actually stored:
 * a shop told its sale ends on the 11th when the 10th is the last day will
 * take a day of it away next time.
 */
export function discountWindowLabel(variant: DiscountFields, timeZone: string): string | null {
  const from = variant.discount_starts_at
    ? shopDateLabel(variant.discount_starts_at, timeZone)
    : null;
  const until = variant.discount_ends_at
    ? shopDateLabel(lastDayEndLabelSource(variant.discount_ends_at), timeZone)
    : null;

  if (from && until) return `${from} – ${until}`;
  if (until) return `until ${until}`;
  if (from) return `from ${from}`;
  return null;
}

/** The instant to LABEL an exclusive end by: a moment inside the last day. */
function lastDayEndLabelSource(endsAt: string): string {
  const parsed = new Date(endsAt);
  if (Number.isNaN(parsed.getTime())) return endsAt;
  return new Date(parsed.getTime() - 1).toISOString();
}

/**
 * Whether a fixed discount has eaten the whole price.
 *
 * effective_price clamps at "0.00" rather than going negative, so this is
 * almost always a repriced item with a promotion nobody withdrew — worth
 * warning about in the form, never worth blocking: selling below cost is
 * legitimate (clearance is real) and so, occasionally, is giving something
 * away.
 */
export function isFreeAfterDiscount(variant: Pick<ProductVariant, "effective_price">): boolean {
  return Number(variant.effective_price) <= 0;
}
