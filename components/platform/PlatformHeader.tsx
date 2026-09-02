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

const LINKS = [{ href: "/platform/billing", label: "Transfers" }] as const;

/**
 * A top bar rather than the sidebar the shop admin uses. The console is one
 * screen deep and reads across every tenant — borrowing the shop's chrome
 * would make it easy to forget, mid-review, that you are not inside a shop.
 * The badge says whose console this is for the same reason.
 */
export function PlatformHeader({ admin }: { admin: PlatformAdmin | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = usePlatformLogout();

  // Falls back to the name stored at sign-in so the bar isn't blank on first
  // paint while /platform/me is still in flight.
  const name = admin?.name ?? getStoredPlatformAdminName();

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

      <nav className="flex items-center gap-1">
        {LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
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
