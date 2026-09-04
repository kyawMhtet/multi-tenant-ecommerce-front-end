"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useCreateStaff } from "@/lib/hooks/useCreateStaff";
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
import type { ShopRole, StaffRoleOption } from "@/lib/types";

const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = Partial<Record<"name" | "email" | "password" | "role", string>>;

export function NewStaffDialog({ roles }: { roles: StaffRoleOption[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ShopRole>("cashier");
  const [errors, setErrors] = useState<FieldErrors>({});

  const create = useCreateStaff();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("cashier");
      setErrors({});
      create.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.reset();

    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Give this person a name.";
    if (!email.trim()) next.email = "An email address is required.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const member = await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      toast.success(`${member.name} can now sign in with that email and password.`);
      setOpen(false);
    } catch {
      return;
    }
  }

  const serverErrors = create.error instanceof ApiError ? create.error.errors : undefined;
  function fieldError(field: keyof FieldErrors) {
    return serverErrors?.[field]?.[0] ?? errors[field];
  }

  const hasFieldError = Boolean(
    fieldError("name") || fieldError("email") || fieldError("password") || fieldError("role"),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" className={controls.button} />}>
        <Plus className="size-4" />
        Add user
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AuthField
            label="Name"
            required
            autoComplete="off"
            placeholder="Su Su Aung"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldError("name")}
          />

          <AuthField
            label="Email"
            type="email"
            required
            autoComplete="off"
            placeholder="susu@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError("email")}
            hint="This is how they sign in, and it can't be changed later."
          />

          <AuthField
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError("password")}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters. Give it to them yourself — they sign in with it as-is.`}
          />

          <StaffRoleField
            roles={roles}
            value={role}
            onChange={setRole}
            error={fieldError("role")}
          />

          <ApiErrorState
            error={hasFieldError ? null : create.error}
            fallback="Could not add this user. Please try again."
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
            <Button type="submit" disabled={create.isPending} className={controls.button}>
              {create.isPending ? "Adding..." : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
