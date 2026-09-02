"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useDispatchOrder } from "@/lib/hooks/useDispatchOrder";
import { useDeliveryProviders } from "@/lib/hooks/useDeliveryProviders";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/shared/ErrorState";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface DispatchErrors {
  provider?: string;
  tracking?: string;
}

/**
 * Handing the parcel over. One dialog for both the first dispatch and a
 * change of courier — the endpoint overwrites, because parcels get lost and
 * re-sent, and a shop that can't say "actually it went with someone else"
 * ends up with a record nobody trusts.
 *
 * Note what this does NOT do: change the order's status. Dispatch and
 * payment are independent (a COD order ships unpaid), so the status badge
 * beside this is untouched by a successful send.
 */
export function DispatchOrderDialog({
  order,
  label,
  variant = "default",
}: {
  order: Order;
  // The panel owns the wording — "Dispatch" vs "Change courier" — since it
  // knows which of the two situations it's in. The button itself is built
  // here so both entry points get the same size and behaviour.
  label: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [tracking, setTracking] = useState("");
  const [errors, setErrors] = useState<DispatchErrors>({});

  const {
    data: providers,
    isPending: providersPending,
    error: providersError,
  } = useDeliveryProviders({ enabled: open });
  const dispatch = useDispatchOrder();

  // Base UI's <SelectValue> renders the raw value unless the root gets an
  // items map — see OrderFilterBar for the long version.
  const providerItems = Object.fromEntries(
    (providers ?? []).map((provider) => [String(provider.id), provider.name]),
  );
  const hasProviders = (providers?.length ?? 0) > 0;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // Re-seeded from the order every time it opens, so "change courier"
      // starts from who it actually went with rather than blank — and a
      // half-finished edit that was cancelled doesn't linger.
      setProviderId(order.delivery_provider_id ? String(order.delivery_provider_id) : "");
      setTracking(order.tracking_number ?? "");
      setErrors({});
      dispatch.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    dispatch.reset();

    if (!providerId) {
      setErrors({ provider: "Choose who is taking this parcel." });
      return;
    }
    setErrors({});

    try {
      await dispatch.mutateAsync({
        id: order.id,
        data: {
          delivery_provider_id: Number(providerId),
          // Omitted rather than sent empty: a shop's own rider has no
          // tracking number, and "" is not the same fact as "none".
          ...(tracking.trim() ? { tracking_number: tracking.trim() } : {}),
        },
      });
      setOpen(false);
      toast.success(order.is_dispatched ? "Courier updated." : "Order marked as sent.");
    } catch {
      // Surfaced via the field errors and the banner below.
    }
  }

  const serverErrors = dispatch.error instanceof ApiError ? (dispatch.error.errors ?? {}) : {};
  const fieldErrors: DispatchErrors = {
    provider: errors.provider ?? serverErrors.delivery_provider_id?.[0],
    tracking: errors.tracking ?? serverErrors.tracking_number?.[0],
  };

  const generalError = (() => {
    if (!dispatch.error) return null;
    if (!(dispatch.error instanceof ApiError)) return "Something went wrong. Please try again.";
    if (fieldErrors.provider || fieldErrors.tracking) return null;
    // Where a pickup or cancelled order lands (both are 422s with no field
    // attached) — shown as-is rather than second-guessed.
    return dispatch.error.message;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant={variant} className={cn(controls.buttonSm, "w-fit")} />}
      >
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {order.is_dispatched ? "Change courier" : `Dispatch ${order.order_number}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="dispatch-provider" className="text-sm font-normal">
              Courier
            </Label>

            {providersError ? (
              <ErrorState message="Couldn't load your couriers. Close this and try again." />
            ) : !providersPending && !hasProviders ? (
              // A dead picker with a link out beats an empty dropdown that
              // looks broken — this is the first time most shops will meet
              // the courier list at all.
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No couriers yet.{" "}
                <Link href="/settings" className="text-primary hover:underline">
                  Add one in Settings
                </Link>{" "}
                — your own rider counts, and needs no tracking number.
              </p>
            ) : (
              <Select
                items={providerItems}
                value={providerId}
                onValueChange={(value) => {
                  setProviderId(typeof value === "string" ? value : "");
                  setErrors({});
                  dispatch.reset();
                }}
              >
                <SelectTrigger
                  id="dispatch-provider"
                  disabled={providersPending}
                  aria-invalid={fieldErrors.provider ? true : undefined}
                  className={cn(controls.select, "w-full")}
                >
                  <SelectValue placeholder={providersPending ? "Loading..." : "Choose a courier"} />
                </SelectTrigger>
                <SelectContent>
                  {(providers ?? []).map((provider) => (
                    <SelectItem key={provider.id} value={String(provider.id)}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {fieldErrors.provider && (
              <span className="text-sm text-destructive">{fieldErrors.provider}</span>
            )}
          </div>

          <Label className="flex flex-col items-stretch gap-1 font-normal">
            <span className="text-sm">Tracking number (optional)</span>
            <Input
              type="text"
              value={tracking}
              placeholder="Leave empty for your own rider"
              onChange={(e) => setTracking(e.target.value)}
              aria-invalid={fieldErrors.tracking ? true : undefined}
              className={controls.input}
            />
            {fieldErrors.tracking && (
              <span className="text-sm text-destructive">{fieldErrors.tracking}</span>
            )}
          </Label>

          {generalError && <ErrorState message={generalError} />}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className={controls.button}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={dispatch.isPending || !hasProviders}
              className={controls.button}
            >
              {dispatch.isPending
                ? "Saving..."
                : order.is_dispatched
                  ? "Update courier"
                  : "Mark as sent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
