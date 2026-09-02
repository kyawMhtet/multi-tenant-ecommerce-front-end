"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePlatformMe } from "@/lib/hooks/usePlatformMe";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { clearStoredPlatformAdminName, clearStoredPlatformToken, getStoredPlatformToken } from "@/lib/platform-auth";

// Routes under (platform) that don't require a token.
const PUBLIC_PATHS = ["/platform/login"];

/**
 * The platform staff console — OUR people, reviewing bank transfers across
 * every shop.
 *
 * A separate route group with a separate layout because the identity is
 * separate: these are PlatformAdmin rows, not users, with no tenant and no
 * presence in the shop app's session at all. Nothing here imports lib/auth.ts,
 * and nothing in (admin) imports lib/platform-auth.ts — the two never touch,
 * which is what stops a platform sign-in from evicting a shop owner's session
 * in the same browser.
 *
 * The gate is stricter than (admin)'s deliberately. That one trusts the
 * presence of a token; this one verifies it against GET /platform/me, because
 * a revoked staff token looks identical to a live one from the client's side,
 * and the queue behind this door reads across every tenant on the platform.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // localStorage isn't readable during SSR, so this can only be known after
  // mount. isChecked keeps the first render from deciding anything against a
  // not-yet-read "no token" default.
  const [isChecked, setIsChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Keyed on the pathname, NOT [] — and one effect, not two. Same reasoning as
  // app/(admin)/layout.tsx: this layout wraps /platform/login too, so it never
  // remounts on the way from the login screen to the queue. A []-deps effect
  // would read the token once, before sign-in stored one, and then bounce the
  // admin who had just signed in straight back to the login screen.
  useEffect(() => {
    // Reading a browser-only API that doesn't exist at render/SSR time —
    // there's no derived-state alternative to setState here.
    const token = getStoredPlatformToken() !== null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasToken(token);
    setIsChecked(true);

    if (!token && !isPublicPath) {
      router.replace("/platform/login");
    }
  }, [pathname, isPublicPath, router]);

  const me = usePlatformMe({ enabled: !isPublicPath && isChecked && hasToken });

  // The token exists but the server won't accept it — expired, revoked, or a
  // SHOP token that somehow landed under the platform key. Clear it rather
  // than leaving a dead credential to fail every request behind this.
  useEffect(() => {
    if (me.isError) {
      clearStoredPlatformToken();
      clearStoredPlatformAdminName();
      router.replace("/platform/login");
    }
  }, [me.isError, router]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!isChecked || !hasToken || me.isError) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <PlatformHeader admin={me.data ?? null} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
