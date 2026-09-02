import { NextRequest, NextResponse } from "next/server";
import { resolveTenantSlug } from "@/lib/tenant";

// Paths that only ever belong to the main domain — the shop admin, plus the
// platform staff console. Reachable there as always; on a tenant's storefront
// subdomain they 404 instead of silently rendering the admin dashboard on a
// customer-facing URL. Nothing
// else is needed to route a tenant subdomain to the storefront — Next
// already prefers a literal match (these paths) over the dynamic
// app/(storefront)/[slug]/page.tsx catch-all, so any other path on a
// tenant subdomain falls through to that page on its own.
const ADMIN_PATHS = [
  "/login",
  // Signup is main-domain only: it creates a tenant, so serving it from an
  // existing tenant's subdomain would be nonsense — and keeping it off
  // tenant hosts is also what stops api-client.ts attaching that tenant's
  // X-Tenant-Slug to an unauthenticated request that must not be scoped.
  "/register",
  "/dashboard",
  "/products",
  "/pos",
  "/orders",
  "/payments",
  "/reports",
  "/settings",
  // OUR staff console, not a shop's — reviewing bank transfers across every
  // tenant. It has no business being reachable at
  // {some-shop}.example.com/platform, which would put a cross-tenant queue on
  // a URL that looks like it belongs to one shop.
  "/platform",
];

export function proxy(request: NextRequest) {
  const tenantSlug = resolveTenantSlug(request.headers.get("host") ?? "");

  const isAdminPath = ADMIN_PATHS.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (tenantSlug && isAdminPath) {
    return new NextResponse("Not found", { status: 404 });
  }

  // "/" is the storefront's shop home, which only makes sense on a tenant
  // subdomain — it resolves its shop from the host. On the admin domain
  // there's no tenant to render, so the root goes to the dashboard instead
  // (which bounces to /login on its own when there's no token).
  if (!tenantSlug && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
