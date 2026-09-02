"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, ReceiptText, BarChart3, Wallet, CreditCard, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/lib/hooks/useTenant";
import {
  clearStoredTenantSlug,
  clearStoredToken,
  clearStoredUserName,
  getStoredUserName,
} from "@/lib/auth";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { initials } from "@/lib/initials";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// Grouped, because a flat run of six links gives the eye nothing to hold
// onto. "Sell" is what staff touch during a shift; "Manage" is what an
// owner touches between them.
const NAV_SECTIONS = [
  {
    label: "Sell",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pos", label: "POS", icon: ShoppingCart },
      { href: "/orders", label: "Orders", icon: ReceiptText },
    ],
  },
  {
    label: "Manage",
    links: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/payments", label: "Payments", icon: Wallet },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      // A top-level link rather than something buried in the account menu,
      // because the shop that most needs to reach it is the one that has
      // gone read-only — and every prompt this app shows for a 402 points
      // here.
      { href: "/settings/billing", label: "Billing", icon: CreditCard },
    ],
  },
] as const;

// Shared between the desktop <aside> and the mobile Sheet drawer — same
// tenant block, nav links, and account menu either way. onNavigate closes
// the mobile drawer on link tap; the desktop sidebar never passes it since
// there's nothing to close. showBell renders the notification bell in this
// same top row — only true for the desktop <aside>. AdminMobileNav already
// shows its own bell in the always-visible mobile top bar, so the drawer's
// copy of this same row (mounted only once the drawer is opened) leaves it
// out to avoid a second, redundant bell hidden behind the hamburger.
function SidebarNav({
  onNavigate,
  showBell = false,
}: {
  onNavigate?: () => void;
  showBell?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: tenant } = useTenant();
  // Never renders during SSR — AdminLayout gates this component behind the
  // client-side auth check and returns null until that resolves, so this
  // only ever mounts post-hydration. Reading localStorage directly here
  // (no useState/useEffect indirection) is safe for that reason.
  const userName = getStoredUserName();

  function handleLogout() {
    clearStoredToken();
    clearStoredTenantSlug();
    clearStoredUserName();
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
          {tenant ? initials(tenant.name) : "…"}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm font-semibold tracking-tight">
            {tenant?.name ?? "Loading…"}
          </p>
          <p className="truncate text-xs text-muted-foreground">Shop admin</p>
        </div>
        {showBell && <NotificationBell />}
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className={cn(typography.microLabel, "px-3 pb-1")}>{section.label}</p>
            {section.links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4.5", !isActive && "opacity-80")} strokeWidth={2} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm transition-colors hover:bg-muted">
            <Avatar size="sm">
              <AvatarFallback className="bg-muted font-medium">
                {userName ? initials(userName) : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate font-medium">{userName ?? "Account"}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--anchor-width)">
            <DropdownMenuItem
              onClick={() => {
                onNavigate?.();
                router.push("/settings");
              }}
            >
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// A sidebar, not a top bar: the POS screen (app/(admin)/pos/page.tsx)
// already uses full viewport width for the product picker + cart side by
// side, so this trades a fixed column of horizontal space for not eating a
// row of vertical space on every page — the standard admin-app tradeoff.
// Hidden below md — AdminMobileNav (rendered alongside this in
// app/(admin)/layout.tsx) covers navigation on small screens instead.
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex print:hidden">
      <SidebarNav showBell />
    </aside>
  );
}

export { SidebarNav };
