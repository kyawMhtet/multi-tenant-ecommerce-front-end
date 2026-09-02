"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useCreatePlatformAdmin } from "@/lib/hooks/useCreatePlatformAdmin";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { AuthField } from "@/components/shared/AuthField";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { controls, notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// StorePlatformAdminRequest: min 12, against the shop side's 8. Mirrored here
// so it fails before the round trip — and stated in the hint, with the reason,
// because a longer minimum with no explanation reads as an arbitrary hurdle.
const MIN_PASSWORD_LENGTH = 12;

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

/**
 * Mint a staff account.
 *
 * Worth being clear-eyed about what this screen changes: an account that can
 * read and settle money across every shop on the platform used to require
 * SHELL access (`php artisan platform:create-admin`) and now requires a
 * session. That's a real reduction in the bar, taken deliberately for
 * operational convenience — the command stays as the way the first account
 * exists and the way back from a total lockout.
 *
 * Which is why the password minimum here is 12 rather than the 8 a shop owner
 * gets, and why the field says so.
 */
export function NewPlatformAdminDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const create = useCreatePlatformAdmin();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setErrors({});
      create.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.reset();

    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Give the account a name.";
    if (!email.trim()) next.email = "An email address is required.";
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const admin = await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      toast.success(`${admin.name} can now sign in to the platform console.`);
      setOpen(false);
    } catch {
      // Surfaced inside the dialog below.
    }
  }

  // The API's own field errors win over the local ones — it knows the real
  // rules (including that platform_admins.email has its own unique index,
  // independent of users.email, so the same person can be both staff and a
  // shop owner). This only mirrors them.
  const serverErrors = create.error instanceof ApiError ? create.error.errors : undefined;
  function fieldError(field: keyof FieldErrors) {
    return serverErrors?.[field]?.[0] ?? errors[field];
  }

  const hasFieldError = Boolean(fieldError("name") || fieldError("email") || fieldError("password"));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" className={controls.button} />}>
        <Plus className="size-4" />
        Add admin
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a platform admin</DialogTitle>
        </DialogHeader>

        <div className={cn(notice, noticeTone.warning)} role="note">
          <p className="text-pretty">
            This account will be able to read every shop on the platform and settle payments
            on any of them. There are no roles below this one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AuthField
            label="Name"
            required
            autoComplete="off"
            placeholder="Jordan Aye"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldError("name")}
          />

          <AuthField
            label="Email"
            type="email"
            required
            autoComplete="off"
            placeholder="jordan@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError("email")}
            hint="Separate from shop sign-ins — the same address can own a shop as well."
          />

          <AuthField
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError("password")}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters — longer than a shop's, because this account can read and settle money across every shop.`}
          />

          <ApiErrorState
            error={hasFieldError ? null : create.error}
            fallback="Could not create the account. Please try again."
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
              {create.isPending ? "Creating..." : "Create admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
