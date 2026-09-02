"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { usePlatformLogout } from "@/lib/hooks/usePlatformLogout";
import { Button } from "@/components/ui/button";
import {
  clearStoredPlatformAdminName,
  clearStoredPlatformToken,
  getStoredPlatformAdminName,
} from "@/lib/platform-auth";
import type { PlatformAdmin } from "@/lib/types";
import { controls, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// Order is the order of the work: the directory is where you land and where
// every other action's id comes from, then the queue (money waiting on a
// human), then the ledger (history), then staff.
//
// "Payments" and "Ledger" are deliberately not both called billing. They are
// two different jobs over the same table — a queue of transfers to rule on
// versus history to reconcile against a bank statement — and a nav that
// implied one screen would send people to the wrong one.
const LINKS = [
  { href: "/platform/shops", label: "Shops" },
  { href: "/platform/billing", label: "Payments" },
  { href: "/platform/billing/invoices", label: "Ledger" },
  { href: "/platform/admins", label: "Staff" },
] as const;

/**
 * A top bar rather than the sidebar the shop admin uses. The console reads
 * across every tenant, and borrowing the shop's chrome would make it easy to
 * forget, mid-review, that you are not inside a shop. The badge says whose
 * console this is for the same reason.
 *
 * It stays a top bar now that there are four sections: the shop admin's
 * sidebar is for a place you work all day, and this is a place you visit to
 * settle something. Four links do not need a column of their own.
 */
export function PlatformHeader({ admin }: { admin: PlatformAdmin | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = usePlatformLogout();

  // Falls back to the name stored at sign-in so the bar isn't blank on first
  // paint while /platform/me is still in flight.
  const name = admin?.name ?? getStoredPlatformAdminName();

  // The most specific link this path belongs to. Computed once here rather
  // than per-link so "most specific wins" is stated in one place.
  const activeHref = LINKS.reduce<string | null>((best, link) => {
    const matches = pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (!matches) return best;
    return best === null || link.href.length > best.length ? link.href : best;
  }, null);

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // A token we're about to throw away is useless to us either way —
      // failing to sign out locally because the network blipped is worse.
    }
    clearStoredPlatformToken();
    clearStoredPlatformAdminName();
    router.replace("/platform/login");
  }

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b bg-background px-4 py-3 sm:px-8">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-4.5" strokeWidth={2} />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">Platform console</span>
          <span className="text-xs text-muted-foreground">Staff only</span>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-1">
        {LINKS.map((link) => {
          // The ledger lives UNDER the queue's path (/platform/billing/invoices),
          // so a plain startsWith would light both tabs at once. The longest
          // matching href wins instead — which also keeps /platform/shops/12
          // lighting "Shops".
          const isActive = link.href === activeHref;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-9 items-center rounded-lg px-3 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {name && <span className={typography.muted}>{name}</span>}
        <Button
          type="button"
          variant="outline"
          disabled={logout.isPending}
          onClick={handleLogout}
          className={controls.buttonSm}
        >
          <LogOut className="size-4" />
          {logout.isPending ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </header>
  );
}
