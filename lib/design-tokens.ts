import type { StorefrontProductVariant } from "@/lib/types";

// Single source of truth for anything not already a Tailwind utility.
// See CLAUDE.md's design-system section for the rules these encode.

// Fixed type scale — every page reuses one of these instead of picking a
// font size/weight freehand.
export const typography = {
  pageTitle: "text-3xl font-semibold tracking-tight",
  sectionHeading: "text-base font-semibold tracking-tight",
  body: "text-sm",
  muted: "text-sm text-muted-foreground",
  // Monospaced-width digits so stacked money/quantity columns align on
  // their decimal point instead of visually jittering row to row — the
  // default proportional numerals are the biggest "unstyled spreadsheet"
  // tell in a data-dense table.
  numeric: "tabular-nums",
} as const;

// Storefront-only display scale (customer-facing). The admin app never uses
// these — see app/(storefront) and CLAUDE.md's design-system note. Pairs the
// Bricolage Grotesque display face (`font-display`, loaded in the storefront
// layout) with the shared Geist body font, and leans on tight tracking +
// heavy weights for a bold retail feel. Still the single indigo accent.
export const storefrontType = {
  // clamp so a long shop name still fits a phone without a media-query ladder.
  hero: "font-display text-[clamp(2.75rem,11vw,7.5rem)] leading-[0.9] font-extrabold tracking-[-0.035em]",
  sectionHeading: "font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl",
  wordmark: "font-display text-lg font-bold tracking-[-0.02em]",
  navLabel: "text-[0.7rem] font-bold uppercase tracking-[0.16em]",
  productName: "text-[0.9rem] font-medium leading-snug",
  price: "text-[0.9rem] font-semibold tabular-nums",
  // The product page's headline price — the second-loudest thing on the
  // screen after the product name.
  priceLarge: "font-display text-4xl font-extrabold tracking-[-0.03em] tabular-nums",
} as const;

type StockStatus = StorefrontProductVariant["stock_status"];

// The app's one accent color lives in globals.css as --primary/--ring
// (bg-primary, text-primary, ring-ring) — nothing to alias here. Stock
// status is the one other place allowed a color, since it's semantic
// status, not decoration.
export const stockStatusStyles: Record<StockStatus, { label: string; badgeClassName: string }> = {
  in_stock: {
    label: "In stock",
    badgeClassName: "bg-emerald-100 text-emerald-800",
  },
  low_stock: {
    label: "Low stock",
    badgeClassName: "bg-amber-100 text-amber-800",
  },
  out_of_stock: {
    label: "Out of stock",
    badgeClassName: "bg-red-100 text-red-800",
  },
};

// Customer-facing stock vocabulary. Same three coarse states as
// stockStatusStyles (the API never exposes a count), but the storefront
// says "Sold out" where the admin says "Out of stock" — punchier, and it
// matches the disabled buy button. Colours still come from
// stockStatusStyles.badgeClassName where a pill is wanted.
export const storefrontStockLabel: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Sold out",
};

// Order.status is a free-form string on the Laravel side (no enum cast),
// so this is keyed loosely rather than as a Record over a closed union —
// an unrecognized value (e.g. a future status) falls back to the
// undecorated Badge outline style rather than a lookup crash.
export const orderStatusClassName: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
};

// Product-level storefront visibility, shown in the products table. The
// asymmetry is deliberate: "active" is the expected default, so it stays
// quiet (a live-dot + muted label); "inactive" — the product is hidden from
// customers — gets the same filled treatment as a flagged order status, so
// it's the row that catches the eye.
export const productStatusStyles = {
  active: { label: "Active", dotClassName: "bg-emerald-500" },
  inactive: { label: "Inactive", badgeClassName: "bg-amber-100 text-amber-800" },
} as const;
