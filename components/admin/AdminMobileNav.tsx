"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTenant } from "@/lib/hooks/useTenant";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/admin/AdminSidebar";
import { NotificationBell } from "@/components/admin/NotificationBell";

// Top bar shown only below md, replacing AdminSidebar (hidden at that
// breakpoint) with a hamburger button that opens the same nav content as a
// slide-in drawer.
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const { data: tenant } = useTenant();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden print:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
        {tenant?.name ?? "Loading…"}
      </p>
      <NotificationBell />
    </header>
  );
}
