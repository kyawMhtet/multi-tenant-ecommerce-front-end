@AGENTS.md

# [Working name: TBD] — admin/POS frontend

## Stack
- Next.js App Router, TypeScript, Tailwind
- Route groups: (storefront) and (admin)
- Talks to a separate Laravel API — base URL in NEXT_PUBLIC_API_URL

## Non-negotiable: use the API client
- Every request to the Laravel API goes through lib/api-client.ts.
  Never call fetch() directly against the API from a component or
  page — api-client.ts is the only place the X-Tenant-Slug header and
  auth token get attached, so bypassing it silently breaks tenant
  scoping or auth on that request.
- Tenant slug resolution is subdomain-based, via proxy.ts +
  lib/tenant.ts (resolveTenantSlug) — {tenant-slug}.localhost:3000
  for dev, 'admin'/'www'/no subdomain routes to (admin). api-client.ts
  reads it client-side from window.location.host for unauthenticated
  requests only (login, storefront).
- Authenticated (admin) requests deliberately send no X-Tenant-Slug at
  all — Laravel's ResolveTenant derives the tenant from the
  authenticated user directly and never reads the header on that
  path, so sending one would be dead weight. The admin's own tenant
  slug (AuthUser.tenant_slug from the login response) is still stored
  client-side via setStoredTenantSlug/getStoredTenantSlug in
  lib/auth.ts — not for the header, only for building this tenant's
  storefront links (e.g. the Copy Link button on the product edit
  screen), since the admin app itself has no subdomain to read one
  from.

## Layering: components → hooks → api → api-client
- Three layers, strict one-way calls — no layer skips ahead to the
  one below it:
  - lib/api/*.ts — pure typed functions, no React, no React Query.
    Each one wraps apiFetch from lib/api-client.ts and returns the
    unwrapped resource (not the raw `{ data: ... }` envelope).
  - lib/hooks/*.ts — React Query hooks (useQuery/useMutation), each
    calling exactly one lib/api/ function. Mutations that change a
    resource a list screen depends on (creating/updating a product,
    a POS sale that changes stock) invalidate that query key on
    success instead of the caller manually refetching.
  - Components/pages — call hooks only. Importing the ApiError class
    from lib/api-client.ts to narrow a hook's error value is fine
    (that's a type check, not a network call); calling apiFetch or a
    lib/api/ function directly from a component is not.
- Query keys: `["products"]` for the list, `["products", id]` for
  one product, `["storefront-product", slug]` for the public product
  page, `["tenant"]` for the shop profile, `["public-shop"]` for its
  public counterpart, `["billing"]` for the subscription payload and
  `["billing", "invoices", page]` for its history, `["me"]` for the signed-in
  user, `["staff"]` for the shop's own logins, `["platform-me"]` and
  `["platform-billing", "pending", page]` / `["platform-billing",
  "awaiting-transfer", page]` for the staff console. Keep new
  resources consistent with this so invalidateQueries's prefix matching
  keeps working (invalidating `["products"]` also matches
  `["products", id]`, and `["billing"]` also matches the invoice pages).

## Shop profile (tenant settings + storefront)
- PATCH /api/v1/tenant is method-spoofed multipart (POST + `_method=PATCH`)
  because it carries logo/cover uploads — lib/api/tenant.ts owns that whole
  encoding, including the quirks below. Don't rebuild it in a component.
- It is genuinely partial: an omitted field is left untouched, and `""` is
  what clears one (Laravel's ConvertEmptyStringsToNull makes it null). So
  "unchanged" and "cleared" are different payloads — app/(admin)/settings
  diffs against a baseline snapshot rather than resending the whole form,
  which would clobber concurrent edits.
- `logo`/`remove_logo` (and cover) are mutually exclusive — sending both is
  a 422. components/admin/ShopImageField.tsx makes that unrepresentable in
  its own state; keep it that way rather than re-checking at the call site.
- business_hours is a whole-week replacement: all seven days are required
  whenever it's sent at all, a closed day is an empty array (no
  `closed: true` flag), max 2 intervals per day, and overnight spans are
  unsupported (close must be > open — a shop open late uses 23:59).
- social_links only accepts facebook/instagram/tiktok/telegram/messenger
  (https:// URLs) and viber_phone (a bare number — build the
  viber://chat?number= link with viberLink() in lib/shop-profile.ts).
  Anything rendered into an `<a href>` on the storefront is re-checked
  client-side too; a stored bad scheme must never reach a customer.
- Storefront: the home page (`/` on a tenant subdomain) queries
  usePublicShop(); the product page reads the same payload off
  `product.shop` instead — it's reached by a pasted link with no slug to
  look the shop up with, which is why the backend embeds it. Don't add a
  second request there.

## Platform billing (the shop paying US)
- 402 Payment Required is the API's billing refusal, and it is NEVER 403 —
  403 would say "you may not", which is both wrong and unactionable. Parse
  it with parseBillingError() in lib/billing-error.ts and render it with
  components/shared/ApiErrorState.tsx, which every admin screen now uses in
  place of a hand-rolled `error instanceof ApiError ? ... : "..."` string.
  Use ApiErrorState for any new API-backed screen so it inherits the
  upgrade prompt instead of having to remember it. A 422 with reason
  `billing_action_unavailable` is NOT an upgrade prompt — nothing there is
  fixed by paying — so it renders as a plain message.
- Gated today: profit_reports (GET /reports/sales-profit), card_payments
  (the Stripe endpoints, and enabling `card`), preorder (allow_preorder on
  a variant), plus every catalogue/config WRITE when the shop is read-only.
  Orders, POS, fulfilment, reads and the storefront are deliberately never
  gated.
- GET /api/v1/billing already derives everything (is_read_only, is_in_grace,
  grace_ends_at, access_ends_at). Read those booleans; never recompute them
  from the dates beside them — grace differs by rail and a cancellation gets
  none, so a second implementation will eventually disagree with the API.
  lib/billing.ts is the one place that turns them into words.
- A lapsed shop is NOT downgraded: it stays on its plan and goes read-only,
  so always print `plan_label` rather than inferring a plan from what the
  shop can currently do. Over-limit shops keep all their data; only creating
  more is refused.
- POST /billing/subscribe does not change the plan — it returns a Stripe
  redirect or bank details. Nothing may announce a new plan from it, and the
  Stripe return page re-reads GET /billing (useBilling sets
  refetchOnMount: "always") rather than trusting `?billing=success`.
- A payment screenshot is a claim, not proof: only `status: "paid"` means
  paid. invoiceStatusLabel() in lib/billing.ts is what keeps a pending
  invoice with an upload reading as "Awaiting review".
- Only render rails present in a plan's own `rails` array. Card is
  permanently absent for MMK shops (Stripe doesn't support the currency), so
  a hardcoded card button is a dead button, not a styling choice.
- The manual rail's staff queue is TWO lists, and conflating them is what the
  split undid. GET /billing/pending is only invoices WITH a screenshot — one
  decision per row. GET /billing/awaiting-transfer is the proofless ones
  (proof_url always null): a chase list, led by shop.owner_email /
  owner_phone and by age, not by the invoice. It is not read-only — a transfer
  spotted on the bank statement still has to be settleable from there, so
  approve and reject stay reachable, just `quiet`.
- A proofless intent older than 30 days is voided lazily, the next time that
  shop asks to pay, with note "Expired — no transfer was received against this
  reference." So `void` has two causes; the ledger prints `note` beneath the
  badge because "Superseded" alone can't tell them apart.

## Preorder deposits
- `preorder_deposit_percent` (0-100) replaced the old
  `preorder_requires_prepayment` boolean everywhere. 0 is no deposit, 100 is
  pay in full, 50 is half — a strict superset, so the extremes behave as
  before.
- ANY value above 0 hides cash on delivery, not just 100: COD collects nothing
  at the moment of ordering, so "half now" is exactly as impossible on it as
  "all now". The percentage decides HOW MUCH, never WHETHER the method can
  take it. Server-side that's a 422 on a cod cart carrying a deposit.
- On StorefrontProductVariant it is `number | null`, and null means "not a
  preorder line", NOT zero — withheld unless stock_status is "preorder", same
  as preorder_lead_time_days, so a deposit can never be rendered against
  something on the shelf.
- cartDepositDue() in lib/cart.ts rounds PER LINE and then sums, because
  OrderService writes deposit_amount per order ITEM. Summing first and
  rounding once can differ by a unit from what is actually charged. Its
  roundMoney() goes through toFixed before Math.round to reproduce PHP's
  round() on values like 2.675 — verified against php directly, not assumed.
- The deposit covers goods only, so the delivery fee always falls in the
  balance. lib/preorder.ts owns the wording (depositText,
  depositBalanceLabel) for the same reason it owns preorderWaitText: the
  panel, cart and checkout summary must not drift.
- `payment_status` now includes "partial" — a deposit landed, the balance
  hasn't. It is the expected happy path for a preorder, NOT a failure, so it
  takes the backorder violet rather than a warning colour, and `status`
  deliberately stays "pending" beside it. paymentStatusLabel /
  paymentStatusClassName in lib/design-tokens.ts are its own map, separate
  from orderStatusClassName — two columns, two meanings.

## Roles: one ladder, and /me is the only source
- A shop has MANY logins now. GET /api/v1/me is what says who is signed in —
  read it through useMe()/useRole(), never from the login response. Caching a
  role at sign-in means an owner's demotion doesn't take effect until the
  demoted person happens to log out, which is the one case it exists for.
- app/(admin)/layout.tsx gates on that request and renders nothing until it
  resolves, so every useRole() below it already has an answer — a role check
  that ran early would flash owner-only controls at a cashier.
- Strict ladder, no matrix: owner ⊃ manager ⊃ cashier, and
  roleAtLeast(role, "manager") in lib/roles.ts is every check in the app.
  `role:manager` server-side is a FLOOR, not an exact match.
- Hide what the role can't do rather than letting it 403 on click: the API
  refuses regardless, but a button that always errors is worse than no button.
  Screens gate their QUERY too (`enabled: isOwner` on useBilling, useStaff,
  useStripeStatus, `enabled: canManage` on useSalesProfitReport) — otherwise
  every non-owner fires a guaranteed 403 on page load.
- Manager+: product/variant writes and restock, order cancel and refund,
  courier writes, the sales-profit report. Owner only: staff, all of /billing,
  PATCH /tenant, payment-method config and Stripe onboarding. Everything else —
  POS, orders, dispatch, reads, the storefront — is deliberately open to a
  cashier.
- ProductVariant.buying_price is OPTIONAL in lib/types.ts because
  ProductVariantResource omits the key entirely for a cashier (absent, not
  null). Anything reading cost must handle that, and a margin/cost column is
  hidden for cashiers rather than rendered blank.
- Three refusals that must never be conflated, all handled by ApiErrorState:
  403 `insufficient_role` (wrong role — "ask the shop owner", NEVER an upgrade
  prompt), 403 `shop_suspended` (platform staff locked this shop out), and 402
  `plan_limit_exceeded` with limit "staff" (out of seats — this one IS the
  upgrade prompt). parseAccessError() in lib/access-error.ts owns the two 403s
  and runs BEFORE parseBillingError, which only ever looks at 402/422.
- A 422 `staff_action_unavailable` carries a rule about that one action ("You
  cannot remove your own account.") — show its `message` verbatim; it is not
  an upgrade prompt either.
- Seats count EVERY login including the owner, and `meta.limit: null` means
  unlimited, not unknown. Build the role dropdown from `meta.roles`, not from
  SHOP_ROLES, so a role added server-side needs no frontend release.
- Signing in clears the whole React Query cache (useLogin), and so does
  signing out. Without that, the next user in the same tab briefly renders
  against the previous user's role and shop data.

## Platform admin: a second, separate identity
- (platform) is OUR staff reviewing bank transfers, not shop users. Separate
  table server-side, separate token, and the two are refused at each other's
  doors (a shop token 403s on /platform/*, and vice versa).
- lib/auth.ts stores the SHOP token under "admin_auth_token". Platform
  credentials live in lib/platform-auth.ts under their own keys and travel
  through platformApiFetch, not apiFetch — writing a platform token to the
  shop's key would sign a shop owner out of their own browser session and
  then send that token to shop endpoints, where it 403s.
- Platform routes are main-domain only; proxy.ts 404s /platform on a tenant
  subdomain, same as the admin paths.

## Architecture pattern
- (admin) routes are behind auth — check the auth state pattern
  established in app/(admin)/login/page.tsx before adding new admin
  pages.
- Match the existing products screens (app/(admin)/products/) as the
  reference pattern for new CRUD screens: list page, new page, edit
  page, client-side validation matching the Laravel Form Requests.
- Shared TypeScript types for API responses go in lib/types.ts,
  mirroring the Laravel API Resources — update both sides together
  when a Resource's shape changes.

## Design system: component folders
- components/ui/ — shadcn primitives only (Button, Input, Card, etc.) —
  generated by `shadcn add`, never hand-edited beyond what the CLI
  produces.
- components/shared/ — composed components used by BOTH admin and
  storefront: PageContainer, EmptyState, LoadingState, ErrorState,
  StockBadge.
- components/admin/ — composed components specific to (admin): AdminNav,
  ProductForm, VariantDialog, POSCart, ReceiptView.
- components/storefront/ — composed components specific to (storefront):
  CheckoutForm.
- components/platform/ — composed components specific to (platform), the
  staff console: PlatformHeader, PendingInvoiceCard, ReviewInvoiceDialog.
  Nothing here may be imported by (admin) or (storefront), and nothing in
  those may be imported here unless it's in shared/ — the two apps have
  different identities and must not grow a shared session or nav.
- A page (app/**/page.tsx) should mostly assemble components, not define
  UI logic inline. If a chunk of JSX in a page is reused or complex
  enough to name, it becomes a component in shared/, admin/, or
  storefront/ — never left inline "for now."
- Every page wraps its content in components/shared/PageContainer.tsx
  (size="sm"|"auth"|"md"|"lg"|"full") instead of applying max-width/padding
  ad hoc. "auth" is the login/signup width; "full" opts out of a max-width
  (the orders and products tables use it).
- lib/design-tokens.ts is the single source of truth for anything not
  already a Tailwind utility: the fixed typography scale (pageTitle,
  sectionHeading, body, muted, microLabel, metric), the stock-status colors
  (in-stock/low-stock/out-of-stock), the `surface` panel style, and
  `statusPill` geometry. Reuse these instead of picking font sizes or status
  colors freehand.
- `controls` in that file is the admin's control scale (button 40px,
  buttonSm 36px, input 40px, search 44px, select, textarea). The shadcn
  primitives ship a much denser scale (h-8 buttons/inputs, h-7 `size="sm"`),
  which is why admin call sites layer a control token over the variant
  classes — `cn(buttonVariants({ variant }), controls.button)` — rather than
  editing components/ui/. Do the same for new controls; don't reintroduce a
  bare h-8 button or input on an admin screen.
- components/shared/TableCard.tsx owns table density for everything inside
  it (header strip, small-caps column labels, px-5 gutters, py-4 rows) via
  descendant selectors. Don't re-declare padding on a TableCell — it will be
  outranked and silently do nothing. The app's one accent color lives as
  --primary/--ring in app/globals.css (bg-primary, text-primary,
  ring-ring) — nothing else gets a second color.

## Testing
- No test setup yet. Flag if a screen has non-trivial logic (cart
  math, stock validation) that should get tests before we add a
  testing framework.

## Workflow
This project is being built learn-by-doing. Explain the reasoning
behind a pattern before implementing it, especially anything touching
auth state or the API client.
