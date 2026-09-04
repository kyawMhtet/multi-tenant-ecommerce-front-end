"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useDeleteStaff } from "@/lib/hooks/useDeleteStaff";
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
import { controls } from "@/lib/design-tokens";
import type { StaffMember } from "@/lib/types";

export function RemoveStaffDialog({ member }: { member: StaffMember }) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteStaff();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) remove.reset();
  }

  async function handleConfirm() {
    remove.reset();
    try {
      await remove.mutateAsync(member.id);
      toast.success(`${member.name} no longer has access.`);
      setOpen(false);
    } catch {
      return;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className={`${controls.buttonSm} text-muted-foreground hover:text-destructive`}
          />
        }
      >
        Remove
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {member.name}?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{member.email}</span> is signed out
            everywhere straight away and can no longer sign in.
          </p>
          <p>There is no undo. Adding them back means creating the account again.</p>
        </div>

        <ApiErrorState
          error={remove.error}
          fallback="Could not remove this user. Please try again."
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className={controls.button}
          >
            Keep account
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={handleConfirm}
            className={controls.button}
          >
            {remove.isPending ? "Removing..." : "Remove user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
