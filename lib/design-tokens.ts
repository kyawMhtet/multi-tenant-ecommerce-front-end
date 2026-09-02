import type { StorefrontProductVariant } from "@/lib/types";

// Single source of truth for anything not already a Tailwind utility.
// See CLAUDE.md's design-system section for the rules these encode.

// Fixed type scale — every page reuses one of these instead of picking a
// font size/weight freehand.
export const typography = {
  pageTitle: "text-2xl font-semibold tracking-[-0.02em] sm:text-3xl",
  sectionHeading: "text-base font-semibold tracking-tight",
  body: "text-sm",
  muted: "text-sm text-muted-foreground",
  // Monospaced-width digits so stacked money/quantity columns align on
  // their decimal point instead of visually jittering row to row — the
  // default proportional numerals are the biggest "unstyled spreadsheet"
  // tell in a data-dense table.
  numeric: "tabular-nums",
  // Small caps for anything that labels a value rather than being one:
  // table column headers, StatCard captions, the eyebrow above a page
  // title. Uppercase + wide tracking at a size the eye skips over is what
  // separates a designed table from a default one — the header stops
  // competing with the data underneath it while staying scannable.
  microLabel: "text-[0.6875rem] font-semibold tracking-[0.09em] text-muted-foreground uppercase",
  // The one number a card exists to show. Tight tracking and leading-none
  // so a row of these reads as a line of figures rather than paragraphs.
  metric: "text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums",
} as const;

// The app's control scale.
//
// components/ui/* is shadcn CLI output and stays that way (CLAUDE.md), but
// the sizes it ships are deliberately compact — a 32px button, a 32px
// input, a 28px `size="sm"` — which reads cramped on an admin screen and
// sits under the ~40px comfortable pointer/tap target. This is the scale
// the admin actually uses, layered over a primitive's own variant classes
// with cn() so tailwind-merge drops the primitive's h-*/px-* instead of
// leaving both in the class string:
//
//   <Button className={controls.button}>
//   <Link className={cn(buttonVariants({ variant: "outline" }), controls.button)}>
//
// Keeping it here rather than editing components/ui/button.tsx means a
// future `shadcn add` can't silently revert it.
export const controls = {
  // Primary page/dialog actions.
  button: "h-10 gap-2 rounded-xl px-4 text-sm",
  // Secondary actions that sit inside a panel header or a table row, where
  // a full-height button would out-shout the content it acts on.
  buttonSm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
  iconButton: "size-10 rounded-xl",
  input: "h-10 rounded-xl px-3.5 text-sm",
  // No height: Textarea sizes itself from min-h + field-sizing-content, and
  // a fixed h-* here would be silently outranked by that min-height anyway.
  textarea: "rounded-xl px-3.5 py-2.5 text-sm",
  // SelectTrigger sizes itself with `data-[size=default]:h-8`, an
  // attribute selector that outranks a plain `h-10` on specificity — so the
  // override has to carry the same variant prefix to land at all (and for
  // tailwind-merge to recognise the two as the same utility). Only valid on
  // a trigger left at its default size.
  select: "data-[size=default]:h-10 rounded-xl px-3.5 text-sm",
  // Taller than a normal input on purpose: the search field is the primary
  // affordance on every list screen, and pl-10/pr-10 reserve the gutters
  // for the leading magnifier and the trailing clear/spinner slot.
  search: "h-11 rounded-xl pl-10 pr-10 text-sm",
} as const;

// Surfaces. One radius and one border weight for every panel in the admin,
// so a stat card, a table card and a filter bar visibly belong to the same
// system. Deliberately border-not-shadow: stacked drop shadows are the
// loudest "2016 dashboard" tell, and hairlines let the page ground do the
// separating instead.
export const surface = {
  panel: "rounded-2xl border bg-card",
  // A panel that holds its own padding (stat cards, filter bars) rather
  // than edge-to-edge content (tables).
  panelPadded: "rounded-2xl border bg-card p-5",
} as const;

// Geometry shared by every status pill in the admin — order status, stock
// status, backorder, preorder, refund-owed. They routinely appear side by
// side in one table cell, so they have to agree on height and radius or the
// cell reads as ragged; only the colour is allowed to differ between them.
// Badge's own h-5 default is a hair too tight to sit in a 16px-padded row.
export const statusPill = "h-6 rounded-full px-2.5 text-[0.7rem]";

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
  // Sky, deliberately not red or amber: preorder is a normal, orderable
  // state with a wait attached, not a warning. Sitting it next to the
  // out-of-stock red would read as a problem the customer should avoid.
  preorder: {
    label: "Preorder",
    badgeClassName: "bg-sky-100 text-sky-900",
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
  preorder: "Preorder",
};

// A negative current_stock: units sold that the shop still owes customers.
// Deliberately outside stockStatusStyles' three states — a backlog isn't a
// worse kind of low stock, it's the opposite instruction (chase the
// supplier, people are waiting; not reorder soon), so it must not read as
// the same amber warning. Violet also matches StatCard's own violet tone,
// which is what the dashboard's backlog card uses.
export const backorderClassName = "bg-violet-100 text-violet-800";

// Money the shop still owes a customer. Deliberately not one of the
// orderStatusClassName entries: "refund owed" is not a status the order is
// in, it's an obligation sitting on top of one — a cancelled order carries
// it while still reading as cancelled. Rose rather than the red those
// terminal statuses use, so the two can sit side by side in one row.
export const refundOwedClassName = "bg-rose-100 text-rose-800";

// Order.status is a free-form string on the Laravel side (no enum cast),
// so this is keyed loosely rather than as a Record over a closed union —
// an unrecognized value (e.g. a future status) falls back to the neutral
// Badge secondary style rather than a lookup crash.
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
// Order.source rendered for people. The raw values are "pos"/"online", and
// a CSS `capitalize` on the first turns the acronym into "Pos" — which is
// exactly the kind of detail that makes a table look unfinished. Keyed
// loosely for the same reason as orderStatusClassName; an unknown source
// falls back to its raw value at the call site.
export const orderSourceLabel: Record<string, string> = {
  pos: "POS",
  online: "Online",
};

export const productStatusStyles = {
  active: { label: "Active", dotClassName: "bg-emerald-500" },
  inactive: { label: "Inactive", badgeClassName: "bg-amber-100 text-amber-800" },
} as const;

// Inline notice surfaces — a bordered wash carrying a short message that is
// ABOUT the screen rather than part of it: a billing warning, an upgrade
// prompt, a "no payment method is on" nudge.
//
// Three tones and no more, because a notice's colour is the only thing
// telling the reader how urgently to act:
//   warning — something will break soon, and there is still time (grace).
//   danger  — it has already broken (read-only, a rejected transfer).
//   accent  — nothing is wrong; this is an offer (upgrade, plan features).
// Same light-only washes as stockStatusStyles and orderStatusClassName above,
// so the whole status vocabulary stays on one system.
export const noticeTone = {
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  accent: "border-primary/30 bg-primary/5 text-foreground",
} as const;

export type NoticeTone = keyof typeof noticeTone;

// Geometry every notice shares, so a warning and an upgrade prompt sitting in
// the same column line up. Pairs with a noticeTone above.
export const notice = "flex gap-3 rounded-xl border px-4 py-3.5 text-sm";

// Subscription invoice status. Keyed loosely for the same reason
// orderStatusClassName is — it's a plain column server-side, so an
// unrecognised value falls back to the neutral Badge style rather than
// crashing a lookup.
//
// 'failed' reads as "Rejected" to a shop, because on the manual rail that is
// what it means: a human looked at the transfer and said no. There is
// deliberately no style here that a PENDING invoice can borrow to look
// settled — see invoiceStatusLabel() in lib/billing.ts.
export const invoiceStatusClassName: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  // Superseded. Deliberately the only entry with no colour of its own: a void
  // invoice is history the shop should still be able to find, not a state it
  // has to act on. Giving it a wash would put it in the same visual league as
  // a rejected transfer, which does need acting on.
  void: "bg-muted text-muted-foreground",
};

// Subscription status as PLATFORM STAFF filter it — the four values
// IndexPlatformShopRequest accepts. Keyed loosely like the maps above so an
// unrecognised value falls back to the neutral Badge style.
//
// Same washes as orderStatusClassName so the whole app keeps one status
// vocabulary: a reviewer who has learned that amber means "act soon" on an
// order reads it the same way on a shop.
export const subscriptionStatusClassName: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  // Sky, not emerald: a trial is working but hasn't paid, and colouring it
  // like an active subscription would hide exactly the rows worth chasing.
  trialing: "bg-sky-100 text-sky-900",
  past_due: "bg-amber-100 text-amber-800",
  cancelled: "bg-muted text-muted-foreground",
};

// Flags on a shop row in the platform console (see shopFlags() in
// lib/platform-shops.ts). Ordered here by severity, same as they render.
export const shopFlagClassName: Record<string, string> = {
  // Deliberately the app's own ink rather than another coloured wash: a
  // suspension is something WE did, not a state the shop drifted into. It has
  // to be distinguishable at a glance from read-only, which is billing's doing
  // and reversible by the shop paying — the two have completely different
  // remedies and must not read as shades of the same problem.
  suspended: "bg-foreground text-background",
  // Already broken.
  readOnly: "bg-red-100 text-red-800",
  // Broken soon, still fixable — the loudest warning that isn't a failure.
  grace: "bg-amber-100 text-amber-800",
  trial: "bg-sky-100 text-sky-900",
  // The hard kill switch. Not settable from the console, so this is
  // information rather than a state anyone here can act on.
  inactive: "bg-red-100 text-red-800",
};

// Platform staff accounts. Only two states, and "inactive" is the one worth
// seeing: an active admin is the expected default.
export const staffStatusClassName: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-muted text-muted-foreground",
};
