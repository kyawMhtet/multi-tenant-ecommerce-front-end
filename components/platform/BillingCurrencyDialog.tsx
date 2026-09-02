"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { useSetBillingCurrency } from "@/lib/hooks/useSetBillingCurrency";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { BillingCurrency, PlatformShop, PlatformShopSubscription } from "@/lib/types";
import { controls, notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// The only two currencies the platform can RECEIVE. Deliberately not
// SHOP_CURRENCIES, which is the three a shop can SELL in: a USD-selling shop
// still has to pay us in Baht or Kyat, because those are the accounts that
// exist.
const BILLING_CURRENCIES: BillingCurrency[] = ["THB", "MMK"];

// "follow" is this dialog's word for null. The API takes `currency: null` to
// mean "go back to following the shop's selling currency", which is right for
// almost every shop — so it has to be an offered choice, not the absence of
// one.
const FOLLOW = "follow";

/**
 * Which currency a shop pays US in.
 *
 * Staff-only server-side, and worth understanding why rather than assuming
 * it's caution: the price ladders are not at parity across currencies and the
 * gap moves with FX, so a shop that could set this itself would have an
 * arbitrage lever rather than a preference.
 *
 * The endpoint takes a SUBSCRIPTION id, which is why this action only became
 * reachable when the shop directory started publishing one — nothing else in
 * either app knows a subscription's id.
 *
 * Changing it VOIDS every pending bank transfer on this subscription. They
 * were raised in the old currency against the old account and can never be
 * paid now, so the dialog says so before committing rather than leaving a
 * reviewer to find a dead invoice marked "Superseded" in the queue.
 */
export function BillingCurrencyDialog({
  shop,
  subscription,
}: {
  shop: PlatformShop;
  subscription: PlatformShopSubscription;
}) {
  const [open, setOpen] = useState(false);
  // Seeded from the EFFECTIVE currency, because the resource on a shop row
  // publishes only that — not whether it came from an override. Picking the
  // value already in effect is a no-op server-side, so this is safe: the
  // backend compares the resolved answer before and after and returns early if
  // nothing actually changes.
  const [value, setValue] = useState<string>(subscription.billing_currency);

  const setCurrency = useSetBillingCurrency();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setValue(subscription.billing_currency);
      setCurrency.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrency.reset();

    const currency = value === FOLLOW ? null : (value as BillingCurrency);

    try {
      const updated = await setCurrency.mutateAsync({
        subscriptionId: subscription.id,
        currency,
      });
      // Reports what the server RESOLVED to, not what was picked: "follow the
      // selling currency" and "THB" can be the same answer, and a toast that
      // echoed the choice would leave staff unsure which one landed.
      toast.success(`${shop.name} is now billed in ${updated.billing_currency}.`);
      setOpen(false);
    } catch {
      // Surfaced inside the dialog below.
    }
  }

  const isChanging = value !== subscription.billing_currency;

  // Base UI's <Select.Value> renders the raw value unless the root is handed an
  // `items` label map — it doesn't read the matching <Select.Item>'s children
  // the way Radix does. Without this the trigger would read "follow".
  const followLabel = `Follow the selling currency${
    shop.selling_currency ? ` (${shop.selling_currency})` : ""
  }`;
  const items: Record<string, string> = {
    [FOLLOW]: followLabel,
    ...Object.fromEntries(BILLING_CURRENCIES.map((code) => [code, code])),
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="outline" className={controls.buttonSm} />}
      >
        <Coins className="size-4" />
        Change billing currency
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Billing currency for {shop.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            What this shop pays us in, and which of our accounts it transfers to. Separate
            from what it <span className="font-medium text-foreground">sells</span> in
            {shop.selling_currency ? ` (${shop.selling_currency})` : ""} — a shop can
            legitimately sell in one currency and bank in another.
          </p>
          <p>
            Leave it following the selling currency unless there&apos;s a reason not to. That
            default is right for almost every shop.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label className="flex flex-col items-stretch gap-1.5 font-normal">
            <span className="text-sm">Bill this shop in</span>
            <Select items={items} value={value} onValueChange={(next) => next && setValue(next)}>
              <SelectTrigger className={cn(controls.select, "w-full")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FOLLOW}>{followLabel}</SelectItem>
                {BILLING_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>

          {isChanging && (
            <div className={cn(notice, noticeTone.warning)} role="note">
              <p className="text-pretty">
                Any bank transfer this shop hasn&apos;t paid yet will be voided — it was
                raised in {subscription.billing_currency} against a different account. They
                will need to be invoiced again in the new currency.
              </p>
            </div>
          )}

          <ApiErrorState
            error={setCurrency.error}
            fallback="Could not change the billing currency. Please try again."
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className={controls.button}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={setCurrency.isPending || !isChanging}
              className={controls.button}
            >
              {setCurrency.isPending ? "Saving..." : "Save currency"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
