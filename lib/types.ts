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
  current_stock: string;
  low_stock_threshold: string | null;
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
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
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
}

// 201 with the exact same shape as LoginResponse (token alongside `data`,
// not nested inside it), so a successful signup logs the owner in outright —
// there is no follow-up call to /api/v1/login.
export type RegisterResponse = LoginResponse;

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

// Mirrors App\Http\Resources\DashboardSummaryResource. today_sales_total
// and the *_count fields come straight off DashboardService::getSummary()
// as plain PHP int/float, not decimal-cast Eloquent attributes — unlike
// every money string elsewhere in this file, these serialize as JSON
// numbers, not strings.
export interface DashboardSummary {
  today_sales_total: number;
  today_order_count: number;
  low_stock_variant_count: number;
  active_product_count: number;
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
  revenue: string;
  cost: string;
  profit: string;
  margin_percentage: number | null;
  order_count: number;
  average_order_value: string | null;
  daily: SalesProfitReportDay[];
}

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
export interface UpdateOrderPayload {
  status?: string;
  payment_status?: string;
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
