"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Phone, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useUpdateDeliveryProvider } from "@/lib/hooks/useUpdateDeliveryProvider";
import { useDeleteDeliveryProvider } from "@/lib/hooks/useDeleteDeliveryProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { controls, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { DeliveryProvider } from "@/lib/types";

/**
 * One courier, read-only until you edit it.
 *
 * Edit-in-place rather than a dialog: there are three short fields, and a
 * modal for "fix a typo in a phone number" is more ceremony than the task.
 */
export function DeliveryProviderRow({ provider }: { provider: DeliveryProvider }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(provider.name);
  const [phone, setPhone] = useState(provider.phone ?? "");
  const [note, setNote] = useState(provider.note ?? "");
  const [nameError, setNameError] = useState<string>();
  // Two-step rather than a confirm dialog: deleting a courier is genuinely
  // safe (past orders keep the name they were dispatched with), so this only
  // needs to stop a misclick, not warn about consequences.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const update = useUpdateDeliveryProvider();
  const remove = useDeleteDeliveryProvider();

  function startEditing() {
    setName(provider.name);
    setPhone(provider.phone ?? "");
    setNote(provider.note ?? "");
    setNameError(undefined);
    update.reset();
    setIsEditing(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    update.reset();

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("A courier needs a name.");
      return;
    }
    setNameError(undefined);

    try {
      await update.mutateAsync({
        id: provider.id,
        data: {
          name: trimmed,
          // "" clears an optional field here, the same convention the tenant
          // endpoint uses for its text fields.
          phone: phone.trim(),
          note: note.trim(),
        },
      });
      setIsEditing(false);
      toast.success("Courier updated.");
    } catch {
      // Surfaced below — a duplicate name lands on the name field.
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(provider.id);
      toast.success(`${provider.name} removed. Past orders keep the name.`);
    } catch {
      toast.error("Couldn't remove that courier. Please try again.");
      setIsConfirmingDelete(false);
    }
  }

  const serverErrors = update.error instanceof ApiError ? (update.error.errors ?? {}) : {};
  const nameMessage = nameError ?? serverErrors.name?.[0];

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm font-normal">Name</span>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameMessage ? true : undefined}
              className={controls.input}
            />
            {nameMessage && <span className="text-sm text-destructive">{nameMessage}</span>}
          </Label>

          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm font-normal">Phone (optional)</span>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={controls.input}
            />
          </Label>
        </div>

        <Label className="flex flex-col items-stretch gap-1">
          <span className="text-sm font-normal">Note (optional)</span>
          <Input
            type="text"
            value={note}
            placeholder="Cut-off time, coverage area, rates…"
            onChange={(e) => setNote(e.target.value)}
            className={controls.input}
          />
        </Label>

        {/* Courier writes are gated for a lapsed shop (reads aren't), so a
            402 here has to offer the way out rather than read as a failure.
            Suppressed while a field error is already saying the same thing. */}
        <ApiErrorState
          error={nameMessage ? null : update.error}
          fallback="Something went wrong. Please try again."
        />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={update.isPending} className={controls.buttonSm}>
            {update.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            className={controls.buttonSm}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{provider.name}</span>
        {(provider.phone || provider.note) && (
          <span className={cn(typography.muted, "flex flex-wrap items-center gap-x-2 text-xs")}>
            {provider.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {provider.phone}
              </span>
            )}
            {provider.phone && provider.note && <span aria-hidden="true">·</span>}
            {provider.note && <span className="truncate">{provider.note}</span>}
          </span>
        )}
      </div>

      {isConfirmingDelete ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={handleDelete}
            className={controls.buttonSm}
          >
            {remove.isPending ? "Removing..." : "Confirm"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsConfirmingDelete(false)}
            className={controls.buttonSm}
          >
            Keep
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={startEditing}
            className={controls.buttonSm}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Remove ${provider.name}`}
            onClick={() => setIsConfirmingDelete(true)}
            className={cn(controls.buttonSm, "text-muted-foreground hover:text-destructive")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
