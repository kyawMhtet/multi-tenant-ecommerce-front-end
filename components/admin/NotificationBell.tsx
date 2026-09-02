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
import { formatCurrency, formatMoney } from "@/lib/currency";
import { BILLING_PATH } from "@/lib/billing-error";
import { formatBillingDate } from "@/lib/billing";
import { cn } from "@/lib/utils";
import type {
  NewOnlineOrderNotificationData,
  Notification,
  SubscriptionCancelledNotificationData,
  SubscriptionPaymentFailedNotificationData,
  SubscriptionPaymentReceivedNotificationData,
  SubscriptionPaymentReviewedNotificationData,
} from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// type is an open string (see lib/types.ts) — anything this doesn't
// recognise falls back to a generic message rather than breaking.
function describeNotification(notification: Notification, fallbackCurrency: string): string {
  switch (notification.type) {
    case "new_online_order": {
      const data = notification.data as unknown as NewOnlineOrderNotificationData;
      return `New order #${data.order_number} from ${data.customer_name} — ${formatCurrency(data.total, data.currency ?? fallbackCurrency)}`;
    }
    case "subscription_payment_reviewed": {
      const data = notification.data as unknown as SubscriptionPaymentReviewedNotificationData;

      // No fallbackCurrency: the shop's TRADING currency is the wrong unit
      // here. Billing resolves its own currency from it (a USD shop is billed
      // in the platform default), so the payload's currency is the only
      // correct one. formatMoney rather than formatCurrency so an unexpected
      // code degrades to a bare number instead of throwing a RangeError and
      // taking the whole popover down with it.
      const amount = formatMoney(data.amount, data.currency);

      if (data.approved) {
        return `Your ${data.plan_label} payment was confirmed — ${amount}`;
      }

      // The reason is the entire point of a rejection: a shop told only
      // "rejected" cannot act on it, and opens a support ticket instead. The
      // note is required server-side on this path, so the fallback is for a
      // payload that somehow arrives without one — still actionable, because
      // the row links to billing either way.
      return data.note
        ? `Your ${data.plan_label} transfer wasn't accepted: ${data.note}`
        : `Your ${data.plan_label} transfer wasn't accepted — open billing to try again.`;
    }
    case "subscription_payment_received": {
      const data = notification.data as unknown as SubscriptionPaymentReceivedNotificationData;
      // "received", not "confirmed" — confirmed is the reviewed case's word and
      // implies a person looked at it. Here the gateway settled it outright.
      // Same currency reasoning as above: the payload's, never the tenant's.
      return `Your ${data.plan_label} payment was received — ${formatMoney(data.amount, data.currency)}`;
    }
    case "subscription_payment_failed": {
      const data = notification.data as unknown as SubscriptionPaymentFailedNotificationData;

      // Reassurance FIRST, and the problem second. A decline does not cut
      // access — the shop keeps working right through the grace window — so a
      // row that opens like a shutdown notice makes people panic about a shop
      // that is completely fine. These arrive webhook-driven with nobody
      // looking at the app, so this sentence has no surrounding context to
      // soften it.
      const graceEnds = formatBillingDate(data.grace_ends_at);

      return graceEnds
        ? `Card payment didn't go through — your shop is still running. Update your card by ${graceEnds}.`
        : "Card payment didn't go through — your shop is still running. Update your card to keep it that way.";
    }
    case "subscription_cancelled": {
      const data = notification.data as unknown as SubscriptionCancelledNotificationData;

      // Leads with what they KEEP, which heads off both halves of the usual
      // support pair — "I cancelled and lost access" and "I cancelled, will you
      // charge me again". Nothing is taken away on the day of cancelling.
      const accessEnds = formatBillingDate(data.access_ends_at);

      return accessEnds
        ? `Subscription cancelled — you keep ${data.plan_label} until ${accessEnds}.`
        : `Subscription cancelled — you keep the ${data.plan_label} access you've already paid for.`;
    }
    default:
      return "New notification";
  }
}

// Where a notification row goes when tapped. Nothing here should be a dead
// end: a notification that can't be acted on is one the shop has to go and
// find the subject of by hand.
function notificationHref(notification: Notification): string | null {
  // Every billing notification's answer is on the billing screen, so this
  // matches the PREFIX rather than listing types: a rejected transfer's
  // recovery path (the invoice stays unpaid and payable, so the shop can
  // transfer again and re-upload against the same one), a received payment's
  // new period, a declined card, a cancellation's remaining access — all of it
  // is there. Matching the prefix is also what stops the next billing type
  // added server-side from arriving as a dead-end row, which is exactly how
  // this branch came to be needed in the first place. Same reasoning as the
  // order branch below duck-typing on order_id.
  if (notification.type.startsWith("subscription_")) {
    return BILLING_PATH;
  }

  // Duck-typed on the payload rather than switched on type, which is how this
  // already worked: any notification carrying an order_id is about that order,
  // so a future order-related type links correctly with no change here.
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
              const href = notificationHref(notification);
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
