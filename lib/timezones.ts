import { SHOP_CURRENCIES, type ShopCurrency } from "@/lib/types";

// What the API falls back to when signup omits these — mirrored here so the
// form's initial state matches what the server would have chosen anyway.
export const DEFAULT_TIMEZONE = "Asia/Yangon";
export const DEFAULT_CURRENCY: ShopCurrency = "MMK";

// Enough to keep the picker usable if Intl.supportedValuesOf is missing
// (it's ES2022 — everywhere current, but this is a signup form and an empty
// dropdown would be a dead end rather than a degraded one).
const FALLBACK_TIMEZONES = [
  "Asia/Yangon",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Jakarta",
  "Asia/Ho_Chi_Minh",
  "Asia/Manila",
  "Asia/Dhaka",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "America/New_York",
  "UTC",
];

/**
 * Every IANA zone the browser knows, sorted. Called from a mount effect,
 * never during render: the server's list and the browser's can differ, and
 * so can the zone `detectTimezone` picks, which would be a hydration
 * mismatch on a form the owner is already typing into.
 */
export function listTimezones(): string[] {
  const supported = Intl.supportedValuesOf?.("timeZone");
  return supported && supported.length > 0 ? [...supported] : FALLBACK_TIMEZONES;
}

/**
 * The browser's own zone, which is the right default far more often than
 * any fixed guess. Falls back to the API's default if the browser won't say
 * (or reports something Intl doesn't recognise).
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

// Zone → currency for the countries this is actually sold in. Only ever a
// starting suggestion for the signup form's currency field, which the owner
// can change — and must, since currency is permanent afterwards.
const CURRENCY_BY_TIMEZONE: Record<string, ShopCurrency> = {
  "Asia/Yangon": "MMK",
  "Asia/Rangoon": "MMK",
  "Asia/Bangkok": "THB",
};

/**
 * A first guess at the shop's currency from its zone. Anything unmapped
 * gets the API's own default rather than a guess dressed up as a detection.
 */
export function suggestCurrency(timezone: string): ShopCurrency {
  return CURRENCY_BY_TIMEZONE[timezone] ?? DEFAULT_CURRENCY;
}

export function isShopCurrency(value: string): value is ShopCurrency {
  return (SHOP_CURRENCIES as readonly string[]).includes(value);
}

/**
 * "Asia/Yangon" → "Yangon". The city half is what a shop owner recognises;
 * the region prefix is filing-system detail. Underscores become spaces
 * ("Ho_Chi_Minh" → "Ho Chi Minh").
 */
export function timezoneCityLabel(timezone: string): string {
  const city = timezone.split("/").pop();
  return city ? city.replace(/_/g, " ") : timezone;
}

/**
 * The zone's current UTC offset as text — "GMT+6:30". Computed for one zone
 * at a time (never mapped over the whole list: that's 400 Intl formatters),
 * and returns null rather than throwing on a zone Intl rejects.
 */
export function timezoneOffsetLabel(timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * How a zone is named next to business hours: "Yangon time (GMT+6:30)".
 * Wall-clock opening times mean nothing without it once anyone outside the
 * shop's own country reads them.
 */
export function timezoneHoursLabel(timezone: string | null | undefined): string | null {
  if (!timezone) return null;
  const offset = timezoneOffsetLabel(timezone);
  const city = timezoneCityLabel(timezone);
  return offset ? `${city} time (${offset})` : `${city} time`;
}
