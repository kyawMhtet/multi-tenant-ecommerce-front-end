import {
  BUSINESS_HOURS_DAYS,
  type BusinessHours,
  type BusinessHoursDay,
  type BusinessHoursInterval,
  type SocialLinks,
} from "@/lib/types";

export const DAY_LABELS: Record<BusinessHoursDay, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_LABELS_SHORT: Record<BusinessHoursDay, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/**
 * An empty week with every day closed — the starting point for the hours
 * editor when a shop has never set any, and the shape the API requires
 * (all seven keys present) whenever business_hours is sent at all.
 */
export function emptyBusinessHours(): BusinessHours {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

/**
 * Fills in any missing day so callers can index all seven without guarding.
 * The API is documented to always return the full week, but business_hours
 * is null outright for a shop that has never set it.
 */
export function normalizeBusinessHours(hours: BusinessHours | null | undefined): BusinessHours {
  const normalized = emptyBusinessHours();
  if (!hours) return normalized;
  BUSINESS_HOURS_DAYS.forEach((day) => {
    normalized[day] = hours[day] ?? [];
  });
  return normalized;
}

/**
 * "9:00 AM" from the API's 24-hour "HH:MM". Built on a fixed throwaway date
 * because Intl needs a Date, and this is a wall-clock time with no date or
 * zone attached — constructing it locally keeps the formatter from shifting
 * it. Returns the raw value unchanged if it isn't parseable, so a
 * surprising API value shows up as itself rather than "Invalid Date".
 */
export function formatTimeOfDay(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return time;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return time;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

/**
 * One day's hours as display text: "9:00 AM – 6:00 PM", split shifts joined
 * with a comma, and "Closed" for an empty day.
 */
export function formatDayHours(intervals: BusinessHoursInterval[]): string {
  if (intervals.length === 0) return "Closed";
  return intervals
    .map((interval) => `${formatTimeOfDay(interval.open)} – ${formatTimeOfDay(interval.close)}`)
    .join(", ");
}

export interface BusinessHoursGroup {
  // "Mon – Fri", or just "Sat" for a run of one.
  label: string;
  hours: string;
  closed: boolean;
}

/**
 * Collapses runs of consecutive days that keep the same hours into one row:
 * a shop open 9–6 on weekdays reads "Mon – Fri  9:00 AM – 6:00 PM" instead
 * of five identical lines. BUSINESS_HOURS_DAYS is already in week order, so
 * a run is just a stretch of equal formatted values.
 *
 * Grouping on the *formatted* text (not the raw intervals) is deliberate —
 * it's exactly what the reader sees, so two days can never be shown
 * separately while looking identical. Closed days group the same way
 * ("Sat – Sun  Closed").
 */
export function groupBusinessHours(hours: BusinessHours | null | undefined): BusinessHoursGroup[] {
  const week = normalizeBusinessHours(hours);
  const runs: Array<{ start: BusinessHoursDay; end: BusinessHoursDay; hours: string; closed: boolean }> =
    [];

  for (const day of BUSINESS_HOURS_DAYS) {
    const text = formatDayHours(week[day]);
    const previous = runs[runs.length - 1];
    if (previous && previous.hours === text) {
      previous.end = day;
    } else {
      runs.push({ start: day, end: day, hours: text, closed: week[day].length === 0 });
    }
  }

  return runs.map(({ start, end, hours: text, closed }) => ({
    label:
      start === end
        ? DAY_LABELS_SHORT[start]
        : `${DAY_LABELS_SHORT[start]} – ${DAY_LABELS_SHORT[end]}`,
    hours: text,
    closed,
  }));
}

/**
 * viber_phone is stored as a bare number, not a URL — this is the link the
 * storefront renders from it. Kept here so the admin preview and the
 * storefront can't build it differently.
 */
export function viberLink(phone: string): string {
  return `viber://chat?number=${encodeURIComponent(phone)}`;
}

/**
 * tel: wants dialable characters only, while the shop's own formatting
 * ("09 7XX XXX XXX") is what the customer should read — so callers render
 * the raw value as the label and use this only for the href.
 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const SOCIAL_URL_PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "telegram", label: "Telegram" },
  { key: "messenger", label: "Messenger" },
] as const satisfies ReadonlyArray<{
  key: Exclude<keyof SocialLinks, "viber_phone">;
  label: string;
}>;

export type SocialLinkKey =
  | (typeof SOCIAL_URL_PLATFORMS)[number]["key"]
  | "viber";

export interface ResolvedSocialLink {
  key: SocialLinkKey;
  label: string;
  href: string;
  // viber:// hands off to an app in the same tab; only real web URLs open a
  // new one.
  isExternal: boolean;
}

// The API only stores https:// for these fields (javascript: is rejected
// server-side), but per CLAUDE.md anything rendered into an <a href> on the
// storefront is re-checked here too — a stored bad scheme must never reach a
// customer, however it got there.
function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Turns a shop's stored social_links into a render-ready, re-validated list:
 * bad or non-http(s) URLs are dropped, and viber_phone (a bare number) is
 * converted to its viber://chat link. One place so the storefront and any
 * admin preview build the same links with the same checks.
 */
export function buildSocialLinks(links: SocialLinks | null): ResolvedSocialLink[] {
  if (!links) return [];
  const built: ResolvedSocialLink[] = [];

  for (const { key, label } of SOCIAL_URL_PLATFORMS) {
    const value = links[key]?.trim();
    if (value && isWebUrl(value)) {
      built.push({ key, label, href: value, isExternal: true });
    }
  }

  const viberPhone = links.viber_phone?.trim();
  if (viberPhone) {
    built.push({ key: "viber", label: "Viber", href: viberLink(viberPhone), isExternal: false });
  }

  return built;
}
