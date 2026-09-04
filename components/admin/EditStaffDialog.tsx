"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useUpdateStaff } from "@/lib/hooks/useUpdateStaff";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { AuthField } from "@/components/shared/AuthField";
import { StaffRoleField } from "@/components/admin/StaffRoleField";
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
import type { ShopRole, StaffMember, StaffRoleOption, UpdateStaffPayload } from "@/lib/types";

const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = Partial<Record<"name" | "password" | "role", string>>;

export function EditStaffDialog({
  member,
  roles,
}: {
  member: StaffMember;
  roles: StaffRoleOption[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member.name);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ShopRole>(member.role);
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = useUpdateStaff();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(member.name);
      setPassword("");
      setRole(member.role);
      setErrors({});
      update.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    update.reset();

    const trimmedName = name.trim();
    const next: FieldErrors = {};
    if (!trimmedName) next.name = "A name is required.";
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters, or leave it blank.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const data: UpdateStaffPayload = {};
    if (trimmedName !== member.name) data.name = trimmedName;
    if (password) data.password = password;
    if (role !== member.role) data.role = role;

    if (Object.keys(data).length === 0) {
      setOpen(false);
      return;
    }

    try {
      await update.mutateAsync({ id: member.id, data });
      toast.success(`Saved ${trimmedName}'s account.`);
      setOpen(false);
    } catch {
      return;
    }
  }

  const serverErrors = update.error instanceof ApiError ? update.error.errors : undefined;
  function fieldError(field: keyof FieldErrors) {
    return serverErrors?.[field]?.[0] ?? errors[field];
  }

  const hasFieldError = Boolean(
    fieldError("name") || fieldError("password") || fieldError("role"),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" className={controls.buttonSm} />}
      >
        Edit
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {member.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AuthField
            label="Name"
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldError("name")}
          />

          <AuthField
            label="Email"
            type="email"
            value={member.email}
            readOnly
            disabled
            hint="Their login can't be changed — it would lock them out of the account."
          />

          <AuthField
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="Leave blank to keep the current one"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError("password")}
            hint={`Only fill this in to reset it — at least ${MIN_PASSWORD_LENGTH} characters.`}
          />

          <StaffRoleField
            roles={roles}
            value={role}
            onChange={setRole}
            disabled={member.is_you}
            disabledHint="You can't change your own role. Ask another owner to do it."
            error={fieldError("role")}
          />

          <ApiErrorState
            error={hasFieldError ? null : update.error}
            fallback="Could not save this user. Please try again."
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className={controls.button}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending} className={controls.button}>
              {update.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
