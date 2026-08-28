"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Loader2Icon } from "lucide-react";
import { useTenant } from "@/lib/hooks/useTenant";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useMarkNotificationRead } from "@/lib/hooks/useMarkNotificationRead";
import { useMarkAllNotificationsRead } from "@/lib/hooks/useMarkAllNotificationsRead";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { NewOnlineOrderNotificationData, Notification } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// type is an open string (see lib/types.ts) — only "new_online_order" is
// understood today, anything else falls back to a generic message rather
// than breaking.
function describeNotification(notification: Notification, fallbackCurrency: string): string {
  switch (notification.type) {
    case "new_online_order": {
      const data = notification.data as unknown as NewOnlineOrderNotificationData;
      return `New order #${data.order_number} from ${data.customer_name} — ${formatCurrency(data.total, data.currency ?? fallbackCurrency)}`;
    }
    default:
      return "New notification";
  }
}

function orderHref(notification: Notification): string | null {
  const orderId = notification.data.order_id;
  return typeof orderId === "number" ? `/orders/${orderId}` : null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: tenant } = useTenant();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: response, isPending } = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = response?.data ?? [];
  const currency = tenant?.currency ?? "USD";

  function handleRowClick(notification: Notification) {
    markRead.mutate(notification.id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" className="relative" />}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">
          Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-2.5">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        </div>

        {isPending && (
          <div className="flex items-center justify-center p-6">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && notifications.length === 0 && (
          <EmptyState
            variant="inline"
            icon={BellOff}
            title="You're all caught up"
            description="New orders and low-stock alerts show up here."
          />
        )}

        {!isPending && notifications.length > 0 && (
          <div className="flex max-h-80 flex-col divide-y overflow-y-auto">
            {notifications.map((notification) => {
              const href = orderHref(notification);
              const message = describeNotification(notification, currency);
              const timestamp = dateFormatter.format(new Date(notification.created_at));

              const rowContent = (
                <>
                  <p className="text-sm">{message}</p>
                  <p className="text-xs text-muted-foreground">{timestamp}</p>
                </>
              );
              const rowClassName = "flex flex-col gap-0.5 p-3 text-left transition-colors hover:bg-muted/60";

              return href ? (
                <Link
                  key={notification.id}
                  href={href}
                  className={rowClassName}
                  onClick={() => handleRowClick(notification)}
                >
                  {rowContent}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(rowClassName, "w-full")}
                  onClick={() => handleRowClick(notification)}
                >
                  {rowContent}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
