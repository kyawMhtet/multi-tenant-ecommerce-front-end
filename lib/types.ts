// Mirrors App\Http\Resources\CategoryResource.
export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  // Globally unique (not scoped per-tenant like sku is) short random code —
  // powers the public storefront short link /p/{slug}. Nullable because the
  // column is nullable on rows that predate this migration.
  slug: string | null;
  barcode: string | null;
  variant_name: string | null;
  attributes: Record<string, string> | null;
  unit: string | null;
  // decimal:2-cast columns — Laravel's Eloquent serializes these as
  // strings in JSON, not numbers.
  buying_price: string;
  selling_price: string;
  track_stock: boolean;
  // CAN BE NEGATIVE, and that is correct data, not a bug: a variant sold on
  // preorder goes below zero, and "-7" means seven units already sold that
  // the shop still owes customers. Never clamp it to 0 — see
  // backorderedUnits() in lib/stock.ts, which is how it should be read.
  current_stock: string;
  low_stock_threshold: string | null;
  // Whether this variant may be sold past zero. False by default; the two
  // fields travel together, and the lead time is meaningless without it.
  allow_preorder: boolean;
  // 1–365, or null for "we don't know yet" — which is a real answer, not a
  // missing one, so nothing anywhere defaults it to a number.
  preorder_lead_time_days: number | null;
  // Whether a preorder of this variant has to be paid up front. Only
  // meaningful while allow_preorder is on, and it is NOT a pricing rule —
  // it's what stops a customer picking cash-on-delivery for stock the shop
  // hasn't bought yet.
  preorder_requires_prepayment: boolean;
  is_active: boolean;
  // This variant's own photos, separate from the product's general gallery
  // (Product.images). Empty unless someone explicitly uploaded some for it —
  // "does this variant have dedicated photos" is exactly `images.length > 0`.
  images: ProductImage[];
}

// Mirrors App\Http\Resources\ProductImageResource. `url` is already a full,
// directly-usable URL (Storage::disk('public')->url() on the backend) —
// never construct one client-side. Product::images() is ordered by
// sort_order server-side, so images[0] in a Product/StorefrontProduct is
// always the cover image — no need to re-sort on this side.
export interface ProductImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  is_active: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface ApiResource<T> {
  data: T;
}

// Matches StoreProductRequest::rules() on the Laravel side. This is the
// logical shape lib/api/products.ts's createProduct() accepts — it's sent
// as multipart/form-data (images are real File objects, and Laravel needs
// bracket notation for the nested variant fields), not JSON; see that
// function for the actual wire encoding.
export interface StoreProductPayload {
  name: string;
  description: string | null;
  category_id: number | null;
  variant: {
    sku: string;
    buying_price: number;
    selling_price: number;
    unit: string;
    current_stock: number;
    // Nested under `variant[...]` on the wire, same as the rest of this
    // block. Optional: the backend defaults allow_preorder to false.
    allow_preorder?: boolean;
    preorder_lead_time_days?: number | null;
    preorder_requires_prepayment?: boolean;
  };
  // Max 10 files, each an actual image MIME type, max 2048KB — enforced by
  // StoreProductRequest; ProductImagePicker only warns about the size
  // limit client-side, it isn't the real enforcement.
  images?: File[];
}

// Matches StoreProductVariantRequest::rules() — POST
// /api/v1/products/{id}/variants, for adding a variant to an existing
// product. Same field set/rules as StoreProductPayload's nested `variant`
// block, just unnested and against a different route. track_stock is
// omitted here the same way it's omitted from StoreProductPayload.variant —
// ProductService::createVariantRow() defaults it to true server-side when
// absent. Sent as multipart/form-data (see lib/api/products.ts) so the
// optional per-variant photos can ride along, same as StoreProductPayload.
export interface AddVariantPayload {
  sku: string;
  variant_name?: string;
  unit?: string;
  buying_price: number;
  selling_price: number;
  current_stock?: number;
  allow_preorder?: boolean;
  // Integer 1–365 — anything outside that is a 422 on this key. null clears
  // it back to "no estimate".
  preorder_lead_time_days?: number | null;
  preorder_requires_prepayment?: boolean;
  // Optional per-variant photos. Same limits as product images: up to 10
  // files, 2MB each, real image MIME types (enforced server-side).
  images?: File[];
}

// Matches UpdateProductVariantRequest::rules() — POST + _method=PATCH
// /api/v1/products/{product}/variants/{variant}, method-spoofed multipart
// (same reason as updateProduct: it now carries file uploads). Every field
// is genuinely optional server-side, but this app's edit form always sends
// the full set of current values rather than diffing against the original —
// the backend explicitly documents that resending an unchanged value (e.g.
// the variant's own sku) is fine, so there's no real benefit to
// diff-tracking, just complexity. No current_stock field: stock quantity
// isn't editable here, only through a future dedicated stock-adjustment flow.
//
// images/remove_image_ids fold into this same request, like product images:
// images[] appends (never replaces), remove_image_ids[] drops specific ones
// (each must belong to THIS variant). Both optional and independent.
export interface UpdateVariantPayload {
  sku?: string;
  barcode?: string | null;
  variant_name?: string | null;
  unit?: string;
  buying_price?: number;
  selling_price?: number;
  low_stock_threshold?: number | null;
  track_stock?: boolean;
  allow_preorder?: boolean;
  // Integer 1–365 (422 on this key otherwise), or null for "no estimate".
  preorder_lead_time_days?: number | null;
  preorder_requires_prepayment?: boolean;
  is_active?: boolean;
  images?: File[];
  remove_image_ids?: number[];
}

// Matches StoreRestockRequest::rules() — POST
// /api/v1/products/{product}/variants/{variant}/restock. Rejected with a
// 422 server-side if the variant has track_stock: false — the frontend
// prevents that round-trip by not offering Restock on those variants at
// all, rather than showing a guaranteed-to-fail action. When unit_cost is
// sent, it also updates the variant's buying_price going forward; omitting
// it leaves buying_price untouched.
export interface RestockPayload {
  quantity: number;
  unit_cost?: number;
  note?: string;
}

// Matches UpdateProductRequest::rules() — product fields only, no variant
// (see that FormRequest's comment: variant price/stock changes touch margin
// reporting and the stock ledger, so they get their own endpoint). New
// images are appended to the product's existing gallery, never replace it.
// remove_image_ids and images are processed in the same request, inside one
// transaction — the backend guarantees this is all-or-nothing, so there's
// no partial-failure state to reconcile client-side: either the whole PUT
// succeeds (fields + new images + removals together) or none of it does.
// An id belonging to a different product (even the same tenant's) is
// rejected with a 422, not silently ignored.
export interface UpdateProductPayload {
  name?: string;
  description?: string | null;
  // Deliberately number | undefined, not | null: sending an empty/null
  // value on update to clear a product's category back to "none" is
  // unverified against the backend (category_id is nullable|integer, and
  // an empty multipart field is neither null nor a valid integer — risk of
  // a 422). Only ever send a real id; omit the field entirely otherwise.
  category_id?: number;
  // Product-level visibility, independent of any variant's own is_active:
  // false pulls the whole product from the storefront while its variants
  // keep their state. The edit form always resends the product's current
  // value (same as name/description), so this is only `undefined` for a
  // caller that isn't touching it — lib/api/products.ts omits the multipart
  // field entirely in that case.
  is_active?: boolean;
  images?: File[];
  remove_image_ids?: number[];
}

// Mirrors App\Http\Resources\OrderItemResource exactly (verified against
// the Laravel source, not assumed). Deliberately has no unit_cost field —
// OrderItemResource itself never serializes it ("receipt-facing: no
// unit_cost here... a receipt is something a customer may see"), so there's
// nothing for this type, or the JSX that renders it, to leak even
// accidentally.
export interface OrderItem {
  id: number;
  // Nullable: order_items.product_variant_id is nullOnDelete, so deleting a
  // variant leaves the sold line intact with nothing to point back to.
  // Nothing should be re-fetching the variant through it anyway — see the
  // snapshot note below.
  product_variant_id: number | null;
  product_name: string;
  // Usually null — a simple product's single variant has no name — so this
  // is never the primary way to tell which item was sold. sku/attributes are.
  variant_name: string | null;
  // Snapshots frozen at sale time, exactly like unit_price: if the shop
  // later renames a variant or reassigns its SKU, past orders keep showing
  // what was actually sold. Both columns are nullable (verified against the
  // add_variant_snapshot_to_order_items migration), and existing rows were
  // backfilled, so there's no pre-migration gap to render an empty state for.
  sku: string | null;
  attributes: Record<string, string> | null;
  // decimal:2-cast on the model, so this arrives as "1.00", not 1 — render
  // it through formatQuantity, never raw.
  quantity: string;
  unit_price: string;
  line_total: string;
  // Per line, because a mixed cart is normal: one item off the shelf, one
  // on order. Only the preorder lines are marked, never the whole order's
  // worth of them.
  is_preorder: boolean;
  // This line's own estimate, null when none was given.
  preorder_lead_time_days: number | null;
}

// Mirrors App\Http\Resources\OrderResource. Note there is no nested
// `payment` object — OrderResource doesn't serialize the Payment model at
// all, just `payment_status` on the order itself.
export interface Order {
  id: number;
  order_number: string;
  source: string;
  status: string;
  payment_status: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total: string;
  currency: string;
  // Null for online orders — OrderService only ever sets this from
  // auth()->id(), and a public checkout has no authenticated cashier.
  cashier_id: number | null;
  // cashier_name/customer_name/customer_phone are genuinely always present
  // (not conditionally omitted) — verified OrderService::listOrders() and
  // ::show() both eager-load 'customer'/'cashier', so OrderResource's
  // whenLoaded() calls always resolve, null only when the order itself has
  // no cashier (online) or no customer (POS).
  cashier_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  // How the customer chose to pay ("cod", "qr_transfer", "card", ...). Never
  // switch on an exhaustive union of these — the set is backend-owned and
  // grows; render the label the payments endpoints hand back instead.
  payment_method: string | null;
  // "delivery" | "pickup" in practice, but typed loosely for the same reason
  // as status and payment_method: it's a backend-owned string, and a POS sale
  // or an order predating this field can carry something else (or nothing).
  // Compare against the known values and fall through gracefully.
  fulfillment_type: string | null;
  // Null for pickup orders, and for any order with no address recorded.
  delivery_address: DeliveryAddress | null;
  // Why this order was cancelled. `cancellation_reason` is the stored code
  // and `cancellation_reason_label` its display text — always render the
  // label: the code set is backend-owned and grew twice during development,
  // so a client-side code→label map would silently fall out of date.
  cancellation_reason: string | null;
  cancellation_reason_label: string | null;
  cancelled_at: string | null;
  // null means the *system* cancelled it (an expired payment window, or an
  // unreachable gateway), not that a person did it anonymously — the two
  // read very differently to staff and are shown differently.
  cancelled_by_name: string | null;
  // Not in the documented response shape, so treated as "may not be there"
  // rather than assumed: it's accepted on POST /orders/{id}/cancel, and
  // rendered only when the API does return it.
  cancellation_note?: string | null;
  // The shop's outstanding obligation: cancelling a *paid* order doesn't
  // refund anything, because the money went customer → shop directly and
  // never touched the platform. Nothing else in the app will remind them,
  // which is why this gets a badge rather than a line of small print.
  // On both the list and the detail endpoint. Load-bearing on the list: a
  // preorder order sits at status "pending" for weeks, and without this it
  // reads as one nobody has touched.
  has_preorder_items: boolean;
  // Detail endpoint only — absent from the list, hence optional. The
  // LONGEST lead time across the order's preorder lines, counted from the
  // order date. Null means no estimate was given, which is shown as nothing
  // at all rather than a date this app made up.
  preorder_ready_by?: string | null;
  // On both the list and the detail endpoint, and deliberately NOT derived
  // from status: a cash-on-delivery order is dispatched while still unpaid,
  // and dispatching never moves the status at all.
  is_dispatched: boolean;
  // Detail endpoint only (the list omits them), hence optional throughout.
  // delivery_provider_id goes null once a courier is deleted, which is
  // exactly why the name is snapshotted separately — always DISPLAY the
  // name, never look the id up to get one.
  delivery_provider_id?: number | null;
  delivery_provider_name?: string | null;
  tracking_number?: string | null;
  dispatched_at?: string | null;
  dispatched_by_name?: string | null;
  // ALREADY INCLUDED IN `total` — render it as its own line between
  // subtotal and total, never add it to anything.
  delivery_fee?: string;
  refund_required: boolean;
  // Set by POST /orders/{id}/refund — the shop confirming they sent the
  // money back, not a gateway event.
  refunded_at: string | null;
  refund_note: string | null;
  created_at: string;
  items: OrderItem[];
  // Only on GET /orders/{id} — the list endpoint omits it, hence optional.
  payments?: OrderPayment[];
}

// Matches StoreOrderRequest::rules() — the cart field is named `items`.
export interface StoreOrderPayload {
  items: Array<{ product_variant_id: number; quantity: number }>;
  payment_method: "cash";
}

// Matches IndexOrderRequest::rules() — GET /api/v1/orders.
export interface OrderFilterParams {
  status?: "pending" | "paid" | "processing" | "completed" | "cancelled" | "refunded";
  source?: "pos" | "online";
  // Inclusive whole-day bounds on created_at, "YYYY-MM-DD". date_to before
  // date_from is a 422 server-side — not specially prevented client-side,
  // same as every other validation rule in this app that's just surfaced
  // via the real API error rather than reimplemented.
  date_from?: string;
  date_to?: string;
}

// Mirrors App\Http\Resources\StorefrontProductVariantResource /
// StorefrontProductResource exactly (verified against the Laravel source).
// No buying_price/unit_cost — the Resource itself never serializes them —
// and no raw current_stock, only the coarse stock_status the Resource
// computes, so there's nothing here for a bug elsewhere to accidentally
// expose either.
export interface StorefrontProductVariant {
  slug: string;
  variant_name: string | null;
  attributes: Record<string, string> | null;
  unit: string | null;
  selling_price: string;
  // "preorder" is out of stock but still orderable, with a wait — it is a
  // BUYABLE state, unlike out_of_stock. Anything gating a buy action must
  // test for out_of_stock specifically rather than "not in_stock".
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "preorder";
  // Null unless stock_status is "preorder" — and null even then when the
  // shop hasn't committed to a lead time, which means "ships when stock
  // arrives", never an invented date.
  preorder_lead_time_days: number | null;
  // Whether a preorder of this variant has to be paid up front. Null unless
  // stock_status is "preorder", same as the lead time — so there is no way
  // to render a prepayment demand against something on the shelf. It is
  // what takes cash-on-delivery off the checkout's payment list; see
  // cartRequiresPrepayment() in lib/cart.ts.
  preorder_requires_prepayment: boolean | null;
  // This variant's own photos. Empty for most variants (size-only, no
  // visual difference) — the product page falls back to StorefrontProduct.
  // images when this is empty, and shows these instead when it isn't.
  images: ProductImage[];
}

export interface StorefrontProduct {
  name: string;
  description: string | null;
  variants: StorefrontProductVariant[];
  images: ProductImage[];
  // The same payload GET /api/v1/public/shop returns, embedded here so the
  // product page can render the shop header/footer without a second call —
  // it's reached by a pasted link, with no slug in hand to look the shop up
  // with separately.
  shop: PublicShop;
}

// A catalog-grid item from GET /api/v1/public/products — exactly a
// StorefrontProduct minus the embedded `shop`. The list endpoint omits it
// because the storefront home has already fetched the shop once (via GET
// /api/v1/public/shop) for its header and footer; only the single-product
// page, reached by a bare link, needs it embedded. variants[0].slug is the
// link target and the checkout identifier, same as everywhere else.
export type StorefrontListProduct = Omit<StorefrontProduct, "shop">;

// Matches StorePublicOrderRequest::rules() — verified directly against the
// Laravel source, not assumed. Items are keyed by product_variant_slug
// (not product_variant_id) because StorefrontProductVariantResource never
// exposes a variant's numeric id — the slug is the only identifier a
// public checkout page has. customer_name/customer_phone are both
// genuinely required, not optional.
export interface StoreOnlineOrderPayload {
  items: Array<{ product_variant_slug: string; quantity: number }>;
  customer_name: string;
  customer_phone: string;
  // Required — one of the `method` values from GET /public/payment-methods.
  payment_method: string;
  // Required. Asked explicitly at checkout rather than defaulted: a pickup
  // customer being asked for an address, and a delivery order placed without
  // one, are both bad enough to be worth one extra tap.
  fulfillment_type: FulfillmentType;
  // Required when fulfillment_type is "delivery"; omitted for pickup, where
  // anything sent is discarded server-side anyway.
  delivery_address?: DeliveryAddressInput | null;
  // The customer's payment screenshot, for methods that ask for one. Always
  // optional even then: someone may pay after ordering, and a missing
  // screenshot must never block the order (see lib/api/orders.ts, which
  // switches the request to multipart only when this is present).
  payment_proof?: File;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Matches the self-serve signup endpoint — POST /api/v1/register.
// Unauthenticated, and deliberately sends no X-Tenant-Slug: this request is
// what creates the tenant, so there is no tenant to scope it to yet (and
// api-client.ts only attaches that header on a tenant subdomain, which
// /register is never served from — see proxy.ts's ADMIN_PATHS).
// Field keys are the API's own snake_case rather than this file's usual
// camelCase form-state convention, so Laravel's 422 `errors` keys map onto
// the form fields directly with no translation layer in between.
export interface RegisterPayload {
  shop_name: string;
  // Becomes the shop's storefront subdomain: lowercase letters, numbers and
  // hyphens, max 63 chars, unique, and not one of the platform's reserved
  // words. See lib/slug.ts for the client-side mirror of these rules.
  slug: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  // Min 8 characters. No password_confirmation — the endpoint doesn't
  // accept one, so the form doesn't collect one either.
  password: string;
  // Defaults to MMK server-side if omitted, which is exactly the trap the
  // signup form exists to avoid: a Thai shop that never sees the field
  // silently trades in Kyat forever. Permanent once set — PATCH /tenant
  // ignores it, because money columns carry no currency tag and changing it
  // would reinterpret every order already recorded.
  currency?: ShopCurrency;
  // IANA zone, e.g. "Asia/Bangkok". Defaults to Asia/Yangon server-side.
  // Editable later in settings, unlike currency.
  timezone?: string;
}

// The currencies the backend accepts at signup. A closed union because this
// app decides what it submits — same reasoning as FulfillmentType.
export const SHOP_CURRENCIES = ["MMK", "THB", "USD"] as const;

export type ShopCurrency = (typeof SHOP_CURRENCIES)[number];

// 201 with the created account and NO token: registering is not
// authenticating. The owner is sent to /login to enter the password they just
// chose, which keeps token issuance in exactly one place and leaves the seam
// where email verification would go.
//
// Deliberately NOT `= LoginResponse` any more. It used to be, and the day the
// backend dropped the token this app kept reading `result.token` — writing the
// string "undefined" into localStorage, so every later request sent
// `Bearer undefined` and the app looked signed in while 401ing on everything.
// A distinct type is what makes that a compile error instead.
//
// The account still comes back so the login screen can prefill the email
// rather than making them retype it.
export interface RegisterResponse {
  data: AuthUser;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  tenant_id: number;
  // Mirrors UserResource's `$this->tenant?->slug` — null-safe, so this is
  // null (not absent) if the user somehow has no tenant relation.
  tenant_slug: string | null;
}

// Not wrapped in ApiResource<T> — the token sits alongside `data`, not
// nested inside it, unlike every other endpoint in this file.
export interface LoginResponse {
  data: AuthUser;
  token: string;
}

export const BUSINESS_HOURS_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type BusinessHoursDay = (typeof BUSINESS_HOURS_DAYS)[number];

// "HH:MM", 24-hour. Overnight spans aren't supported server-side — a shop
// open until 2am enters 23:59 rather than wrapping past midnight.
export interface BusinessHoursInterval {
  open: string;
  close: string;
}

// One key per day, all seven required whenever business_hours is sent at
// all — it's a whole-week replacement, not a per-day patch. A closed day is
// an empty array (there is no `closed: true` flag). Up to 2 intervals per
// day, the second being a split shift.
export type BusinessHours = Record<BusinessHoursDay, BusinessHoursInterval[]>;

// Only these keys are accepted — anything else is rejected server-side.
// Every field except viber_phone must be an https:// URL (javascript: URLs
// are rejected); viber_phone is a bare phone number, and the
// viber://chat?number= link is built from it client-side. A null value
// clears that one platform and leaves the others untouched.
export interface SocialLinks {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  telegram?: string | null;
  messenger?: string | null;
  viber_phone?: string | null;
}

// Mirrors App\Http\Resources\TenantResource. Every profile field is
// nullable — a shop that hasn't filled its profile in yet returns null for
// all of them, so guard before rendering (logo_url/cover_url especially).
export interface Tenant {
  id: number;
  name: string;
  slug: string;
  currency: string;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_hours: BusinessHours | null;
  social_links: SocialLinks | null;
  // How this shop fulfils orders. Never both false — the backend rejects
  // turning the last one off, so checkout can always offer at least one.
  allows_delivery: boolean;
  allows_pickup: boolean;
  // Flat fee added to delivery orders; pickup is always free. A money
  // string like every other, so "0.00" (not 0) is what "no fee" looks like.
  delivery_fee: string;
  // IANA zone. business_hours are wall-clock times with no zone of their
  // own, so this is what they actually mean — render the two together.
  timezone: string;
  /**
   * @deprecated Falls back to the owner's signup phone. Prefer
   * business_phone, which is the field the settings screen actually edits.
   */
  phone: string | null;
}

// Matches PATCH /api/v1/tenant. Every field is optional and genuinely
// partial: anything omitted is left untouched server-side, so only send
// what changed.
//
// logo/remove_logo (and cover/remove_cover) are mutually exclusive — sending
// a file and its remove flag in the same request is a 422, not a
// last-one-wins. The settings UI enforces this by making "replace" and
// "remove" separate actions on the same control rather than trusting the
// caller to get it right.
export interface UpdateTenantPayload {
  name?: string;
  // "" clears the field: Laravel's ConvertEmptyStringsToNull turns an empty
  // multipart value into null before validation, which is how a text field
  // gets emptied over multipart (there is no way to send a literal null).
  address?: string;
  business_phone?: string;
  business_email?: string;
  logo?: File;
  cover?: File;
  remove_logo?: boolean;
  remove_cover?: boolean;
  business_hours?: BusinessHours;
  social_links?: SocialLinks;
  // Booleans, and partial like everything else here — send only the one
  // that changed. Turning off whichever is currently the shop's last
  // enabled option is a 422 on `allows_delivery`, enforced server-side
  // across separate requests, not just within one payload.
  allows_delivery?: boolean;
  allows_pickup?: boolean;
  // numeric, min 0. Sent as a string because this payload goes out as
  // multipart (see lib/api/tenant.ts), where every value is a string on the
  // wire anyway — "0" clears it back to free delivery, and unlike the text
  // fields "" is NOT how you do that (ConvertEmptyStringsToNull would make
  // it null, which fails the numeric rule).
  delivery_fee?: string;
  // Editable, unlike currency, which this endpoint ignores outright.
  timezone?: string;
}

// The public subset of Tenant, from GET /api/v1/public/shop — no id, no
// deprecated `phone`, nothing tenant-internal. Also embedded as `shop` on
// the public product response.
export interface PublicShop {
  name: string;
  slug: string;
  currency: string;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_hours: BusinessHours | null;
  social_links: SocialLinks | null;
  // What checkout may offer. At least one is always true, so "neither" is a
  // defensive case in the UI rather than a state the shop can reach.
  allows_delivery: boolean;
  allows_pickup: boolean;
  // What this shop charges to deliver one order, as a 2-decimal string like
  // every other money field. Flat per order, not per line. It applies to
  // delivery only — the server forces it to 0 on a pickup order — and it is
  // computed server-side from this value, never sent up with the order (see
  // StoreOnlineOrderPayload, which has no delivery_fee or total for exactly
  // that reason). Shown before checkout via deliveryFeeFor() in lib/cart.ts.
  delivery_fee: string;
  // The zone business_hours are expressed in — a customer in another zone
  // reading "9:00 – 18:00" needs to be told whose clock that is.
  timezone: string;
}

// Mirrors the `recent_orders` shape inside DashboardSummaryResource — a
// narrower, denormalized slice of Order, not the full OrderResource, used
// to link each row to the full order at GET /api/v1/orders/{id}.
export interface DashboardRecentOrder {
  id: number;
  order_number: string;
  total: string;
  status: string;
  source: string;
  created_at: string;
}

// Mirrors the `low_stock_variants` shape inside DashboardSummaryResource —
// no variant id, only the product it belongs to (that's what the dashboard
// links to, via product_id).
export interface DashboardLowStockVariant {
  product_id: number;
  product_name: string;
  variant_name: string | null;
  current_stock: string;
  low_stock_threshold: string;
}

// Mirrors the `preorder_backlog_variants` shape inside
// DashboardSummaryResource. units_owed is positive — it's the absolute
// value of a negative current_stock, i.e. what customers are waiting for.
// Typed as a plain number to match the counts alongside it, but read
// through Number() at the render site anyway, in case it arrives as a
// decimal-cast string like the low-stock rows' current_stock does.
export interface DashboardPreorderBacklogVariant {
  product_id: number;
  product_name: string;
  variant_name: string | null;
  units_owed: number;
  preorder_lead_time_days: number | null;
}

// Mirrors App\Http\Resources\DashboardSummaryResource. today_sales_total
// and the *_count fields come straight off DashboardService::getSummary()
// as plain PHP int/float, not decimal-cast Eloquent attributes — unlike
// every money string elsewhere in this file, these serialize as JSON
// numbers, not strings.
export interface DashboardSummary {
  // GOODS sales only — delivery fees moved out of this figure and into
  // today_delivery_fees below. Same reasoning as SalesProfitReport.revenue.
  today_sales_total: number;
  // Today's delivery fees, shown beside the sales figure rather than folded
  // into it, so a shop reconciling against the till can see both halves of
  // what was actually taken.
  today_delivery_fees: number;
  today_order_count: number;
  low_stock_variant_count: number;
  active_product_count: number;
  // Paid orders that were cancelled and not yet refunded — money the shop
  // owes back and has no other way to see. Same plain-number convention as
  // the fields above, including the total.
  refunds_owed_count: number;
  refunds_owed_total: number;
  // Variants sold past zero, and the units owed on them. Deliberately
  // separate from low_stock_*, which now EXCLUDES negative-stock variants
  // server-side — the two never count the same variant, because they call
  // for opposite actions (chase the supplier vs. reorder soon).
  preorder_backlog_variant_count: number;
  preorder_backlog_units: number;
  preorder_backlog_variants: DashboardPreorderBacklogVariant[];
  recent_orders: DashboardRecentOrder[];
  low_stock_variants: DashboardLowStockVariant[];
}

// Mirrors the per-day row inside GET /api/v1/reports/sales-profit's
// `daily` array. Money fields are decimal-cast strings, same convention
// as Order's money fields — not DashboardSummary's plain-number
// convention. Always present for every calendar day in [date_from,
// date_to], zero-filled server-side — no client-side gap-filling needed.
export interface SalesProfitReportDay {
  date: string;
  revenue: string;
  cost: string;
  profit: string;
  order_count: number;
}

// Mirrors GET /api/v1/reports/sales-profit's response (verified against
// ReportService::getSalesProfitReport). margin_percentage is null when
// revenue is 0 (nothing to divide by); average_order_value is null when
// order_count is 0 — both render "—" client-side, not "0%"/formatted
// zero, so a genuine 0% margin isn't confused with "no data for this
// range."
export interface SalesProfitReport {
  date_from: string;
  date_to: string;
  // GOODS revenue only — delivery fees are NOT in here (they were, before
  // the backend split them out). profit, margin_percentage and
  // average_order_value all follow from this figure, so they're all
  // goods-only too. Money actually banked is revenue + delivery_fees_collected,
  // which is why the UI labels this "Sales" and shows the fee beside it:
  // most of that fee goes straight to a courier, and nothing records what
  // the courier was paid, so counting it as revenue would overstate profit
  // on every delivered order.
  revenue: string;
  cost: string;
  profit: string;
  margin_percentage: number | null;
  order_count: number;
  average_order_value: string | null;
  // Charged to customers for delivery over the range. Kept out of revenue
  // and out of profit — see the note on `revenue`.
  delivery_fees_collected: string;
  daily: SalesProfitReportDay[];
}

// Matches POST /api/v1/orders/{order}/dispatch. Does not change the
// order's status — dispatching is a fulfillment fact, not a payment or
// lifecycle one.
//
// tracking_number is optional on purpose rather than by oversight: a shop
// delivering with its own rider has no number to type, and requiring one
// would push staff into inventing them.
export interface DispatchOrderPayload {
  delivery_provider_id: number;
  tracking_number?: string;
}

// Mirrors the delivery-provider resource — the shop's own list of couriers.
// Names are unique per shop (a duplicate is a 422 on `name`). Deleting one
// is safe: past orders keep the courier name they were dispatched with,
// because Order.delivery_provider_name is a snapshot, not a join.
export interface DeliveryProvider {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  sort_order: number;
}

// POST /api/v1/delivery-providers.
export interface StoreDeliveryProviderPayload {
  name: string;
  phone?: string;
  note?: string;
  sort_order?: number;
}

// PATCH /api/v1/delivery-providers/{id} — partial, same convention as the
// tenant endpoint: omit what didn't change.
export type UpdateDeliveryProviderPayload = Partial<StoreDeliveryProviderPayload>;

// Matches SalesProfitReportRequest::rules() — GET /api/v1/reports/sales-profit.
// Both independently optional; omitting both lets the backend apply its
// own "start of this month → today" default — deliberately never
// computed/defaulted client-side, to avoid drifting from the backend's
// own timezone-aware definition of "this month."
export interface SalesProfitReportParams {
  date_from?: string;
  date_to?: string;
}

// Shape of `data` on a "new_online_order" notification — verified against
// the sample payload. total is a plain number here (not a decimal-string
// like Order.total elsewhere in this file) since it comes off the
// notification's own stored payload, not a decimal-cast Eloquent
// attribute; currency can be null.
export interface NewOnlineOrderNotificationData {
  order_id: number;
  order_number: string;
  total: number;
  currency: string | null;
  customer_name: string;
  created_at: string;
}

// Shape of `data` on a "subscription_payment_reviewed" notification —
// verified against App\Notifications\SubscriptionPaymentReviewed::toArray().
// Sent to every user of a shop when platform staff approve OR reject its bank
// transfer, and it is the ONLY thing that tells them the outcome: the manual
// rail has no webhook, so without this a shop either notices its plan changed
// or doesn't.
//
// amount is a plain number here — the notification casts it with (float) when
// building its stored payload — NOT the decimal-cast string that
// SubscriptionInvoice.amount is. Don't reuse that type for this.
export interface SubscriptionPaymentReviewedNotificationData {
  invoice_id: number;
  // "SUB-41" — the same string the shop put in the transfer note, so a
  // support conversation has one shared reference.
  reference: string;
  // The outcome. false means rejected, and the invoice stays UNPAID and
  // payable rather than being voided — transferring again and re-uploading
  // against the same invoice is the intended recovery.
  approved: boolean;
  plan: string;
  plan_label: string;
  amount: number;
  // The shop's billing currency, which is not necessarily the currency it
  // trades in — a USD shop has no billing entry and is billed in the platform
  // default. So this is the only correct source here; the tenant's own
  // currency would be wrong.
  currency: string;
  period_end: string | null;
  // The reviewer's reason. Required server-side on a rejection (5–500 chars)
  // and optional on an approval, so it is nullable in general but effectively
  // always present on the case that needs it.
  note: string | null;
}

// Shape of `data` on a "subscription_payment_received" notification —
// verified against App\Notifications\SubscriptionPaymentReceived::toArray().
//
// A CARD payment that succeeded. Deliberately not "reviewed": no human ruled
// on this one, the gateway confirmed it, which is why it carries no `approved`
// flag and no reviewer note. Same (float) cast on amount as the reviewed
// payload — a JSON number, not SubscriptionInvoice.amount's decimal string.
export interface SubscriptionPaymentReceivedNotificationData {
  invoice_id: number;
  reference: string;
  plan: string;
  plan_label: string;
  amount: number;
  // The shop's BILLING currency, which is not necessarily what it sells in.
  currency: string;
  period_end: string | null;
}

// Shape of `data` on a "subscription_payment_failed" notification —
// verified against App\Notifications\SubscriptionPaymentFailed::toArray().
//
// A card was declined. Carries no money: the amount that failed to be taken is
// not something the shop can act on, whereas the DATE is — access is not cut
// on a decline, the shop keeps working through grace, and grace_ends_at is
// when that stops.
export interface SubscriptionPaymentFailedNotificationData {
  plan: string;
  plan_label: string;
  // Derived server-side from Subscription::graceEndsAt(), never stored — the
  // window differs by rail. Null when there is no live entitlement to run out.
  grace_ends_at: string | null;
}

// Shape of `data` on a "subscription_cancelled" notification —
// verified against App\Notifications\SubscriptionCancelled::toArray().
//
// Sent whether the shop cancelled or Stripe confirmed it. access_ends_at is
// the important field and the reason this isn't a bad-news notification: the
// shop keeps everything it has paid for until that date.
export interface SubscriptionCancelledNotificationData {
  plan: string;
  plan_label: string;
  access_ends_at: string | null;
}

// type is deliberately kept as an open string, not a union — more
// notification types are expected later, so data's shape depends on type
// and is only narrowed (cast) at render time by switching on it. id is a
// UUID string, not a number — keep that in mind for keys/routing.
export interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

// Matches GET /api/v1/notifications's query params.
export interface NotificationsPageParams {
  per_page?: number;
  unread_only?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

// Mirrors the admin GET /api/v1/payments/methods rows. The endpoint returns
// every method the platform knows about, configured or not, so this list is
// rendered straight through — never hardcode a method list client-side, and
// never assume `method` is one of today's three.
//
// supports_qr / supports_proof are capability flags, not settings: they say
// which fields a row should offer, so a new backend method appears with the
// right controls without a frontend change.
export interface PaymentMethodConfig {
  method: string;
  label: string;
  // Null for shop-settled methods; the processor's name (e.g. "stripe") for
  // gateway ones. Resolved server-side — never sent on upsert.
  gateway: string | null;
  // The shop collects and confirms this money itself (cash, bank transfer),
  // rather than a processor doing it. Gateway methods have no instructions
  // for the shop to write.
  is_manual: boolean;
  is_enabled: boolean;
  sort_order: number;
  instructions: string | null;
  qr_url: string | null;
  supports_qr: boolean;
  // Whether a customer can attach a payment screenshot at checkout. Purely
  // informational on the admin side — there's no setting behind it.
  supports_proof: boolean;
}

// POST /api/v1/payments/methods — a multipart upsert (201 on create, 200 on
// update; both are just success). Only `method` is required; anything
// omitted is left as-is, so this is a genuine partial update.
export interface UpsertPaymentMethodPayload {
  method: string;
  is_enabled?: boolean;
  sort_order?: number;
  instructions?: string | null;
  // Mutually exclusive with remove_qr — sending both is rejected, the same
  // way logo/remove_logo is on the tenant profile. PaymentMethodCard makes
  // that unrepresentable in its own state rather than re-checking here.
  qr?: File;
  remove_qr?: boolean;
}

// GET /api/v1/payments/stripe/status. `connected` only means an account
// exists — charges_enabled is the one that decides whether card payments can
// actually be taken, so that's what gates the enable toggle.
export interface StripeStatus {
  connected: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

// GET /api/v1/public/payment-methods — the storefront's view, already
// filtered to enabled methods. Keys are omitted rather than nulled when
// absent, so qr_url/instructions are optional here (unlike the admin shape,
// where they're present-and-null).
export interface PublicPaymentMethod {
  method: string;
  label: string;
  requires_proof: boolean;
  qr_url?: string;
  instructions?: string;
}

// One payment record against an order, from GET /orders/{id}. proof_url is
// the customer's uploaded screenshot — a claim the shop eyeballs before
// confirming, never grounds to auto-settle anything.
export interface OrderPayment {
  id: number;
  gateway: string;
  amount: string;
  status: string;
  paid_at: string | null;
  proof_url: string | null;
  created_at: string;
}

// What POST /api/v1/public/orders wants done next. "redirect" carries a
// hosted-checkout url (card); "none" means the order is placed and the
// customer is finished (cod / qr_transfer).
export interface OnlineOrderPaymentAction {
  type: "redirect" | "none";
  url?: string;
}

// The public checkout response is not a plain ApiResource: `payment` sits
// beside `data` at the top level.
export interface OnlineOrderResult {
  order: Order;
  payment: OnlineOrderPaymentAction;
}

// PATCH /api/v1/orders/{id} — the shop confirming an order. Sending
// payment_status: "paid" also settles the order's payment record
// server-side, so there's no second call to reconcile the two.
/**
 * PATCH /api/v1/orders/{id} — the shop moving an order forward.
 *
 * Deliberately NOT the place to cancel or refund: status "cancelled" and
 * payment_status "refunded" are both 422s here now. Cancelling needs a
 * reason (POST /orders/{id}/cancel) and a refund is a separate act the shop
 * performs with its own money (POST /orders/{id}/refund), so neither can be
 * expressed as a plain field update any more.
 */
export interface UpdateOrderPayload {
  status?: string;
  payment_status?: string;
}

// One option in the cancellation picker, from GET
// /api/v1/orders/cancellation-reasons. Fetched, never hardcoded — the list
// is backend-owned and grows.
export interface CancellationReason {
  code: string;
  label: string;
}

// POST /api/v1/orders/{id}/cancel. The reason is required; the note is
// optional except for the "other" code, where omitting it is a 422 on
// cancellation_note.
export interface CancelOrderPayload {
  cancellation_reason: string;
  cancellation_note?: string;
}

// The code whose label is free text, and the one the backend requires a
// note alongside. Compared against the fetched list rather than standing in
// for it.
export const OTHER_CANCELLATION_REASON = "other";

// POST /api/v1/orders/{id}/refund — "I've sent the money back". The note is
// optional but worth prompting for: it's the reference the shop will want
// when the customer asks about it weeks later. A 422 comes back if the
// order was never paid, since there's nothing to give back.
export interface RefundOrderPayload {
  refund_note?: string;
}

// ---------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------

// What the checkout sends. Deliberately a closed union here (unlike the
// response side below): this app decides what it submits, so a typo should
// be a compile error.
export type FulfillmentType = "delivery" | "pickup";

// Where a delivery order goes. full_address is the one field always present
// — the structured keys are omitted entirely unless the customer filled them
// in, so every one of them has to be presence-checked before rendering.
//
// On an order this is a snapshot of where *that* order went, not a pointer to
// the customer's current address. Never re-resolve it against the customer
// record: an old order has to keep showing where it was actually delivered.
export interface DeliveryAddress {
  full_address: string;
  house_number?: string;
  street?: string;
  township?: string;
  city?: string;
  // For the driver — "3rd floor, call on arrival".
  note?: string;
}

// The checkout's own shape before it goes on the wire. Every key optional
// except full_address; lib/api/orders.ts drops the blank ones rather than
// sending empty strings.
export interface DeliveryAddressInput {
  full_address: string;
  house_number?: string;
  street?: string;
  township?: string;
  city?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Platform billing (the shop paying US for the SaaS)
// ---------------------------------------------------------------------------
//
// Not to be confused with the Payments section above, which is money flowing
// customer -> shop. This is money flowing shop -> platform. Same vendor
// (Stripe) on one of the rails, opposite direction, and nothing shared —
// mirroring the backend's own split between config/payments.php and
// config/billing.php.

// A shop is billed in ITS OWN currency, into an account in its own country —
// a Yangon shop cannot easily wire Baht to a Thai bank. Only these two have
// billing entries; a shop on USD falls back to the platform default
// server-side, which is why this is what the API answers with rather than
// tenants.currency.
export type BillingCurrency = "THB" | "MMK";

// The rails a subscription can be paid on. `null` on a trial, which has no
// payment method yet — saying "stripe" there would assert a card that may
// never exist. Card is structurally absent for MMK (Stripe doesn't support
// the currency), so a rail is never assumed, only read from BillingPlan.rails.
export type BillingRail = "stripe" | "manual";

// Mirrors App\Http\Resources\SubscriptionResource.
//
// Every derived answer (is_read_only, is_in_grace, grace_ends_at,
// access_ends_at) is computed SERVER-SIDE and published here on purpose.
// Never recompute one of them from the dates in this object: two
// implementations of the same rule is how a client ends up showing "active"
// over an account the API is already refusing.
export interface Subscription {
  // The plan actually enforced. A lapsed shop is NOT downgraded — it stays on
  // the plan it bought and goes read-only instead, so a lapsed Pro shop
  // reports "pro" here and must never be rendered as a Starter shop.
  plan: string;
  plan_label: string;
  // A plan change already agreed but not yet due — a DOWNGRADE bought while
  // paid time remained. The shop keeps `plan` above until this date, then
  // drops to this one.
  //
  // ABSENT, not null, unless a change is scheduled: the Resource wraps all
  // three in $this->when(), so `"pending_plan" in subscription` is a real
  // check and `pending_plan === null` would never be true. Optional here for
  // exactly that reason.
  //
  // Only the manual rail ever schedules one. A card payment applies its plan
  // the moment the webhook lands and clears any pending change, since Stripe
  // plan moves go through cancel-then-resubscribe.
  pending_plan?: string;
  pending_plan_label?: string;
  pending_plan_starts_at?: string;
  // "trialing" | "active" | "cancelled" today, but read as an open string:
  // it's a plain column server-side, same as Order.status.
  status: string;
  rail: BillingRail | null;
  is_on_trial: boolean;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  // When paid (or trial) access runs out, ignoring grace. Null means no live
  // entitlement at all.
  access_ends_at: string | null;
  // Past the paid period but STILL WORKING — the window in which the shop can
  // fix it before anything stops. This is the one to warn loudly about; by
  // the time is_read_only is true it's too late to be a warning.
  is_in_grace: boolean;
  grace_ends_at: string | null;
  // Writes are already blocked. Reads, the storefront, the POS and order
  // fulfilment all keep working — see RequireWriteAccess on the Laravel side
  // for exactly what is and isn't gated.
  is_read_only: boolean;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
}

// The countable ceilings for a plan. `null` means unlimited, never 0 — zero
// is a real answer to "how many may you create" and stays expressible.
export interface PlanLimits {
  products: number | null;
  staff: number | null;
}

// Why a rail is or isn't usable for a given plan in a given currency.
//
// The split that matters is PERMANENT vs OURS TO FIX:
//   "currency_unsupported" — the provider cannot do this currency and no
//       configuration will change that (Stripe has no MMK support). A
//       statement, never a call to action, and never the word "yet".
//   "not_configured" / "disabled" — this deployment hasn't finished setting it
//       up, or switched it off. Ours to fix, so "get in touch" is the right
//       ask.
export type RailStatus =
  | "available"
  | "currency_unsupported"
  | "not_configured"
  | "disabled";

// Mirrors App\Http\Resources\PlanResource. `features` are PlanFeature enum
// values ("card_payments", "profit_reports", "preorder"); read as an open
// string list so a new backend feature renders rather than crashing.
export interface BillingPlan {
  code: string;
  label: string;
  // A float in major units server-side (750 = 750 THB), not a decimal-cast
  // string like every other money field in this file — it comes from config,
  // not a database column.
  amount: number;
  currency: string;
  limits: PlanLimits;
  features: string[];
  // Which rails this deployment can actually offer for THIS plan in THIS
  // currency. Render only what's in here — a hardcoded card button is exactly
  // the dead button this list exists to prevent, and it is permanently empty
  // of "stripe" for MMK shops.
  rails: BillingRail[];
  // WHY each rail can or can't be used — every rail, including the usable
  // ones, unlike `rails` which lists only those. Mirrors
  // App\Services\Billing\Data\RailAvailability.
  //
  // `rails` stays the source of truth for which buttons to render. This is
  // purely what to SAY about the ones that are missing, and the distinction it
  // draws is the point: "we haven't set this up" and "this can never work in
  // your currency" were indistinguishable before, so a Kyat shop was invited
  // to get in touch about a card option that will never exist.
  rail_status: Record<BillingRail, RailStatus>;
  is_current: boolean;
}

// GET /api/v1/billing — everything the billing screen needs in one call.
export interface BillingOverview {
  currency: BillingCurrency;
  // Null for a tenant with no subscription row at all. Not a state
  // registration can produce (AuthService starts a trial in the same
  // transaction), but the API types it as nullable, so the UI handles it
  // rather than crashing on data created around the app.
  subscription: Subscription | null;
  plans: BillingPlan[];
}

// One billing period's charge — history, not state. Subscription answers
// "what can this shop do today"; this answers "did they pay for March, how,
// and who said so".
export interface SubscriptionInvoice {
  id: number;
  // What the shop puts in the transfer note ("SUB-41"), and what a reviewer
  // matches against the bank statement.
  reference: string;
  plan: string;
  plan_label: string;
  // decimal:2-cast, so a string here, unlike BillingPlan.amount.
  amount: string;
  currency: string;
  rail: BillingRail | null;
  // "pending" | "paid" | "failed" | "void". ONLY "paid" means paid — an
  // uploaded proof_url alongside "pending" is a claim, not a settlement.
  //
  // "void" is superseded: the shop asked for one plan, then asked for a
  // different one before paying, so the earlier invoice was voided rather
  // than deleted (staff must not see two invoices with one screenshot between
  // them). Platform staff changing a shop's billing currency does it too. A
  // void invoice can never be paid or reused — scopeUnpaid() excludes it —
  // but it is still real history, so it stays visible.
  status: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  // The shop's own uploaded screenshot, echoed back so they can see it
  // arrived. Its presence says nothing about whether the money did.
  proof_url: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// POST /api/v1/billing/subscribe. Only `rail`s listed on the chosen plan are
// accepted; there is no amount field, and never will be — what a plan costs
// is resolved server-side from config.
export interface StartSubscriptionPayload {
  plan: string;
  rail: BillingRail;
}

// The platform's own receiving account, shown to a shop that picked transfer.
// Every field is nullable because it's env-held deployment config.
export interface TransferInstructions {
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  notes: string | null;
  amount: string | null;
  currency: string | null;
  reference: string | null;
}

// What the admin app must do next — NOT a confirmation that anything was
// paid. A redirect can be closed and a transfer may never be sent; the plan
// moves only when money is CONFIRMED (by webhook on the card rail, by a human
// on the manual one). Nothing rendered from this may say "you're now on Pro".
export interface BillingInitiation {
  type: "redirect" | "transfer";
  // Set for "redirect" — send the browser here (Stripe Checkout).
  url: string | null;
  // Set for "transfer".
  instructions: TransferInstructions | null;
  invoice: SubscriptionInvoice | null;
}

// ---------------------------------------------------------------------------
// Platform admin (OUR staff, not a shop's)
// ---------------------------------------------------------------------------

// PlatformAdmin rows — a different table from `users`, with no tenant_id and
// no presence in it. Their tokens are not interchangeable with a shop's; see
// lib/platform-auth.ts for why that matters on this side.
export interface PlatformAdmin {
  id: number;
  name: string;
  email: string;
  // Only returned by GET /platform/me, not by the login response.
  last_login_at?: string | null;
}

// POST /api/v1/platform/login. Same envelope quirk as the shop's
// LoginResponse in reverse: here the token sits INSIDE `data`, alongside the
// admin — so it's `data.token`, not a sibling of `data`.
export interface PlatformLoginResponse {
  data: {
    admin: PlatformAdmin;
    token: string;
  };
}

// Mirrors App\Http\Resources\PlatformInvoiceResource — deliberately a
// different resource from SubscriptionInvoice above rather than a flag on it,
// because this one NAMES THE SHOP and must never appear in a response to a
// shop.
export interface PlatformInvoice {
  id: number;
  reference: string;
  shop: {
    id: number | null;
    name: string | null;
    slug: string | null;
    owner_email: string | null;
    owner_phone: string | null;
  };
  plan: string;
  plan_label: string;
  amount: string;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  // Null means the shop asked for bank details and never uploaded anything.
  // Worth chasing, not worth hiding — the queue shows these, ordered after
  // the ones that do have a screenshot.
  proof_url: string | null;
  reviewed_at: string | null;
  note: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Platform console: the shop directory
// ---------------------------------------------------------------------------

// The plan codes the platform sells, and the ONLY values the directory's
// `plan` filter accepts — an unknown one is a 422, not an empty page. A closed
// union for the same reason SHOP_CURRENCIES is one: this app decides what it
// submits. Mirrors PlanCatalog::PLANS' keys.
export const PLATFORM_PLANS = ["starter", "pro"] as const;

export type PlatformPlan = (typeof PLATFORM_PLANS)[number];

// subscriptions.status as the directory filters it. Not the same list as
// Subscription.status above, which is read as an open string because it's a
// plain column — this is the closed set IndexPlatformShopRequest validates
// against, and sending anything else is a 422.
//
// Note "past_due", which the shop-facing app never names: to a shop that state
// is described in words by summariseSubscription(), but staff filter by it.
export const PLATFORM_SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
] as const;

export type PlatformSubscriptionStatus = (typeof PLATFORM_SUBSCRIPTION_STATUSES)[number];

// Mirrors the `subscription` block of App\Http\Resources\PlatformShopResource.
//
// Deliberately NOT the Subscription type above. That one is what a shop is
// told about itself and carries the whole grace/cancellation vocabulary; this
// is the staff-facing summary, and it has a field Subscription can never
// have — the subscription's own `id`, which is what makes the
// billing-currency endpoint reachable at all.
export interface PlatformShopSubscription {
  // The route parameter for POST /platform/subscriptions/{id}/billing-currency.
  // Nothing else in either app knows a subscription id.
  id: number;
  // effectivePlan() server-side, never the raw column: a shop with a scheduled
  // downgrade is still on the plan it paid for, and a LAPSED shop is not
  // downgraded at all — it keeps its plan and goes read-only. Always print
  // plan_label rather than inferring a plan from what the shop can do.
  plan: string;
  plan_label: string;
  status: string;
  rail: BillingRail | null;
  // What the shop pays US in. NOT the same fact as the shop's
  // selling_currency, and a Kyat-selling shop can legitimately be billed in
  // Baht — see BillingCurrency::for(). Labelling both "currency" in one table
  // would make the directory actively misleading.
  billing_currency: BillingCurrency;
  is_on_trial: boolean;
  // Past the paid period but STILL WORKING — the window in which staff can
  // still help the shop fix it before anything stops.
  is_in_grace: boolean;
  is_read_only: boolean;
  current_period_ends_at: string | null;
  // A scheduled downgrade. Unlike Subscription's version of these fields,
  // they're plain nullable columns here (no $this->when()), so null — not
  // absent — is the "nothing scheduled" answer.
  //
  // There is no pending_plan_LABEL on this resource, which is why
  // lib/platform-shops.ts has to label the code itself.
  pending_plan: string | null;
  pending_plan_starts_at: string | null;
}

// Mirrors App\Http\Resources\PlatformShopResource — one shop as OUR staff see
// it. A separate resource from TenantResource server-side precisely because
// this one carries the owner's contact details and the shop's billing
// internals; it must never be rendered on a shop-facing screen.
//
// The same type serves the directory row and the detail page: the extra fields
// are gated with whenLoaded/whenCounted rather than split into a second
// resource, so a list row and a detail page can never disagree about a shop.
export interface PlatformShop {
  id: number;
  name: string;
  slug: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  // What the shop SELLS in (tenants.currency). See
  // PlatformShopSubscription.billing_currency for the other one.
  selling_currency: string | null;
  timezone: string | null;
  // The hard kill switch. Read-only here on purpose: it is the fraud hammer
  // and it strands customers mid-order, so this app shows it and never offers
  // to flip it. Suspension below is the reversible, owner-only action.
  is_active: boolean;
  // The OWNER is locked out of their admin. The storefront keeps serving and
  // customers can still complete checkout — that asymmetry is the entire
  // reason suspension exists apart from is_active.
  is_suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  // Null for a shop created around the app (no subscription row at all).
  // Absent on responses that don't load the relation — every endpoint this app
  // calls does load it, but the field stays optional so a partial payload
  // reads as "unknown" rather than crashing.
  subscription?: PlatformShopSubscription | null;
  // Detail only (whenCounted). The quickest read on a real business versus a
  // dead signup, which is the first thing worth knowing when a shop turns up
  // in the support queue.
  products_count?: number;
  orders_count?: number;
  // Detail only (whenLoaded) — the latest 20, newest first.
  invoices?: PlatformInvoice[];
}

// GET /api/v1/platform/shops. Every value here is validated against a
// catalogue server-side, so a typo is a 422 rather than an empty list that
// would read as "no such shops" — which is why the UI drives these from fixed
// option lists rather than free text.
export interface PlatformShopFilters {
  // Matches name, slug or owner_email — the three things a support request
  // actually arrives with.
  search?: string;
  plan?: PlatformPlan;
  status?: PlatformSubscriptionStatus;
  rail?: BillingRail;
  // The SELLING currency (tenants.currency), not the billing one.
  currency?: ShopCurrency;
  suspended?: boolean;
}

export interface PlatformShopsPageParams extends PlatformShopFilters {
  page?: number;
  per_page?: number;
}

// POST /platform/shops/{id}/suspend. The reason is REQUIRED (5–500 server-side)
// and it is what the owner is shown on their 403, so it can't be a throwaway.
export interface SuspendShopPayload {
  reason: string;
}

// ---------------------------------------------------------------------------
// Platform console: the invoice ledger
// ---------------------------------------------------------------------------

// subscription_invoices.status, as the ledger filters it. Closed here (unlike
// SubscriptionInvoice.status, read as an open string) because these are the
// only four IndexPlatformInvoiceRequest accepts.
export const PLATFORM_INVOICE_STATUSES = ["pending", "paid", "failed", "void"] as const;

export type PlatformInvoiceStatus = (typeof PLATFORM_INVOICE_STATUSES)[number];

// GET /api/v1/platform/billing/invoices — history to reconcile against a bank
// statement, deliberately separate from the pending QUEUE.
export interface PlatformInvoiceFilters {
  // "void" appears here and never in the queue: the shop asked for a different
  // plan, or staff changed its billing currency, before paying.
  status?: PlatformInvoiceStatus;
  rail?: BillingRail;
  // The BILLING currency (what the shop pays us in), so THB/MMK only — not the
  // three selling currencies.
  currency?: BillingCurrency;
  tenant_id?: number;
  // yyyy-MM-dd. Both bounds are INCLUSIVE of the whole day — the backend
  // compares with whereDate, so `to` covers everything raised that day.
  from?: string;
  to?: string;
}

export interface PlatformInvoicesPageParams extends PlatformInvoiceFilters {
  page?: number;
  per_page?: number;
}

// Mirrors App\Http\Resources\PlatformSubscriptionResource — what the
// billing-currency setter answers with. Reports the override and the effective
// answer SEPARATELY, which is the whole point of the field: null means "follows
// the shop's selling currency" (right for almost every shop), and a value means
// someone deliberately decided otherwise.
export interface PlatformSubscription {
  id: number;
  shop: {
    id: number | null;
    name: string | null;
    slug: string | null;
    selling_currency: string | null;
  };
  plan: string;
  plan_label: string;
  status: string;
  rail: BillingRail | null;
  // null = no override, i.e. following the shop's selling currency.
  billing_currency_override: BillingCurrency | null;
  // The resolved answer after the override, the selling currency and the
  // platform default have been tried in that order.
  billing_currency: BillingCurrency;
  current_period_ends_at: string | null;
}

// ---------------------------------------------------------------------------
// Platform console: staff accounts
// ---------------------------------------------------------------------------

// Mirrors App\Http\Resources\PlatformAdminResource — the STAFF LIST row.
//
// Deliberately a different type from PlatformAdmin above, which is the
// hand-built payload PlatformAuthController::me() returns for the signed-in
// admin. They overlap but are not the same shape: only this one carries
// is_active and created_at, and only /me is a promise about the current
// session. Matching the two by `id` is what lets the staff screen disable
// deactivation on your own row.
export interface PlatformStaffAccount {
  id: number;
  name: string;
  email: string;
  // Deactivation is not deletion. EnsurePlatformAdmin re-checks this on every
  // request, so it takes effect on the deactivated admin's very next one —
  // and reactivating restores the account without a fresh sign-in, because
  // their tokens are kept.
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// POST /api/v1/platform/admins. The password minimum is 12, longer than the
// shop side's 8, because these accounts can read and settle money across every
// shop on the platform.
export interface CreatePlatformAdminPayload {
  name: string;
  email: string;
  password: string;
}
