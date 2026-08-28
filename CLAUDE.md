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
  public counterpart. Keep new resources consistent with this so
  invalidateQueries's prefix matching keeps working (invalidating
  `["products"]` also matches `["products", id]`).

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
  sectionHeading, body, muted) and the stock-status colors
  (in-stock/low-stock/out-of-stock). Reuse these instead of picking font
  sizes or status colors freehand. The app's one accent color lives as
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
