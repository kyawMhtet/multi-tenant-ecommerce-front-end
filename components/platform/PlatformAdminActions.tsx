"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useDeactivatePlatformAdmin } from "@/lib/hooks/useDeactivatePlatformAdmin";
import { useReactivatePlatformAdmin } from "@/lib/hooks/useReactivatePlatformAdmin";
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
import type { PlatformStaffAccount } from "@/lib/types";
import { controls } from "@/lib/design-tokens";

/**
 * Deactivate or reactivate one staff account.
 *
 * Deactivation is NOT deletion, and the dialog says so, because the difference
 * is what makes it safe to use: the row stays (subscription_invoices.reviewed_by
 * points at it — deleting one would erase who confirmed a payment), the
 * account's tokens are kept, and reactivating restores it without a fresh
 * sign-in. It takes effect on their very next request rather than at their
 * next sign-in, since is_active is re-checked on every one.
 *
 * `isSelf` disables the button on your own row. That is COURTESY, not the
 * guard — the API refuses self-deactivation with a 422 (reason
 * "billing_action_unavailable") because the last active admin doing it would
 * lock every human out of the payment queue with no way back but the artisan
 * command. The disabled state just means nobody has to discover that by
 * clicking.
 */
export function PlatformAdminActions({
  admin,
  isSelf,
}: {
  admin: PlatformStaffAccount;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);

  const deactivate = useDeactivatePlatformAdmin();
  const reactivate = useReactivatePlatformAdmin();
  const mutation = admin.is_active ? deactivate : reactivate;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) mutation.reset();
  }

  async function handleConfirm() {
    mutation.reset();
    try {
      if (admin.is_active) {
        await deactivate.mutateAsync(admin.id);
        toast.success(`${admin.name} can no longer use the console.`);
      } else {
        await reactivate.mutateAsync(admin.id);
        toast.success(`${admin.name}'s access is back — no new sign-in needed.`);
      }
      setOpen(false);
    } catch {
      // Surfaced inside the dialog below.
    }
  }

  if (isSelf && admin.is_active) {
    return (
      <span
        className="text-sm text-muted-foreground"
        title="You can't deactivate your own account. Ask another admin to do it."
      >
        You
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={admin.is_active ? "outline" : "default"}
            className={controls.buttonSm}
          />
        }
      >
        {admin.is_active ? "Deactivate" : "Reactivate"}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {admin.is_active ? `Deactivate ${admin.name}?` : `Reactivate ${admin.name}?`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          {admin.is_active ? (
            <>
              <p>
                <span className="font-medium text-foreground">{admin.email}</span> stops
                working on their very next request — they don&apos;t have to be signed out
                for it to take effect.
              </p>
              <p>
                Nothing is deleted. Their name stays on every payment they&apos;ve already
                approved, and reactivating gives the account back exactly as it was.
              </p>
            </>
          ) : (
            <p>
              <span className="font-medium text-foreground">{admin.email}</span> will be able
              to use the console again straight away. Their existing sign-in still works, so
              there&apos;s nothing for them to do.
            </p>
          )}
        </div>

        <ApiErrorState
          error={mutation.error}
          fallback="Could not change this account. Please try again."
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
            type="button"
            variant={admin.is_active ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={handleConfirm}
            className={controls.button}
          >
            {mutation.isPending
              ? admin.is_active
                ? "Deactivating..."
                : "Reactivating..."
              : admin.is_active
                ? "Deactivate"
                : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
