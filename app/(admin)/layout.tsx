"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { SubscriptionBanner } from "@/components/admin/SubscriptionBanner";
import { ShopSuspendedNotice } from "@/components/admin/ShopSuspendedNotice";
import { PageContainer } from "@/components/shared/PageContainer";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { ApiError } from "@/lib/api-client";
import { useMe } from "@/lib/hooks/useMe";
import {
  clearStoredTenantSlug,
  clearStoredToken,
  clearStoredUserName,
  getStoredToken,
} from "@/lib/auth";

// Routes under (admin) that don't require a token. Update as more
// unauthenticated admin routes (e.g. password reset) are added.
const PUBLIC_PATHS = ["/login", "/register"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // localStorage isn't available during SSR, so the token can only be read
  // client-side, after mount. isChecked keeps the first render from deciding
  // anything against a not-yet-read "no token" default.
  const [isChecked, setIsChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Keyed on the pathname, NOT [] — and deliberately one effect, not two.
  //
  // This layout wraps every route in the (admin) group, /login and /register
  // included, so navigating from /login to /dashboard never remounts it.
  // A []-deps effect therefore reads the token exactly once, on the first
  // mount, which on those two pages is always *before* sign-in stores one.
  // isAuthed then stayed false forever, and the moment the pathname changed
  // to a non-public route the redirect fired — bouncing a user who had just
  // signed in (or just created a shop) straight back to /login.
  //
  // The read and the redirect share one effect so the redirect always sees
  // the token this run just read. Split apart, both would still run in the
  // same commit and the redirect's closure would hold the *previous*
  // render's isAuthed — the same stale false, just harder to spot.
  useEffect(() => {
    // Reading a browser-only API (localStorage) that doesn't exist at
    // render/SSR time — there's no derived-state alternative to setState
    // here, since the value literally can't be known until this effect
    // runs on the client.
    const authed = getStoredToken() !== null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthed(authed);
    setIsChecked(true);

    if (!authed && !isPublicPath) {
      router.replace("/login");
    }
  }, [pathname, isPublicPath, router]);

  const me = useMe({ enabled: !isPublicPath && isChecked && isAuthed });

  const isTokenDead = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (!isTokenDead) return;
    clearStoredToken();
    clearStoredTenantSlug();
    clearStoredUserName();
    router.replace("/login");
  }, [isTokenDead, router]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!isChecked || !isAuthed || isTokenDead) {
    return null;
  }

  if (me.isPending) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/40 md:flex md:h-screen md:overflow-hidden print:bg-white">
      <AdminSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminMobileNav />
        {/* Above the content of every admin screen, not inside one: a lapsed
            or overdue subscription is a fact about the whole app, and a
            warning only visible on the page you happened to open is a warning
            that arrives too late. Mounted inside the authed branch, so it
            never fires a billing request from /login or /register. */}
        <ShopSuspendedNotice />
        <SubscriptionBanner />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {me.isError ? (
            <PageContainer size="md">
              <ApiErrorState error={me.error} fallback="Could not load your account." />
            </PageContainer>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
