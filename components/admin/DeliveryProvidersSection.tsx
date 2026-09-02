"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bike, Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useDeliveryProviders } from "@/lib/hooks/useDeliveryProviders";
import { useCreateDeliveryProvider } from "@/lib/hooks/useCreateDeliveryProvider";
import { SettingsSection } from "@/components/admin/SettingsSection";
import { DeliveryProviderRow } from "@/components/admin/DeliveryProviderRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { controls } from "@/lib/design-tokens";

/**
 * The shop's couriers — who it hands parcels to, and what the dispatch
 * dialog offers as options.
 *
 * Rendered as a sibling of ShopProfileForm rather than inside it, for two
 * reasons: these are their own endpoints (not part of the tenant PATCH), and
 * a <form> nested inside another <form> is invalid HTML — the add button
 * would submit the shop profile instead.
 */
export function DeliveryProvidersSection() {
  const { data: providers, isPending, error: queryError } = useDeliveryProviders();
  const create = useCreateDeliveryProvider();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState<string>();


  function openAddForm() {
    setName("");
    setPhone("");
    setNote("");
    setNameError(undefined);
    create.reset();
    setIsAdding(true);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    create.reset();

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("A courier needs a name.");
      return;
    }
    setNameError(undefined);

    try {
      await create.mutateAsync({
        name: trimmed,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        // Appended to the end of the current list. Without this every new
        // courier shares the backend's default and the picker's order comes
        // out arbitrary — this is the cheapest way to keep "the one I added
        // first is at the top" true.
        sort_order: providers?.length ?? 0,
      });
      setIsAdding(false);
      toast.success("Courier added.");
    } catch {
      // Surfaced below — a duplicate name is a 422 on `name`.
    }
  }

  const serverErrors = create.error instanceof ApiError ? (create.error.errors ?? {}) : {};
  const nameMessage = nameError ?? serverErrors.name?.[0];

  return (
    <SettingsSection
      title="Couriers"
      description="Who you hand delivery orders to. These are the options on an order's Dispatch action."
    >
      <ApiErrorState error={queryError} fallback="Couldn't load your couriers." />

      {!queryError && isPending && <LoadingState rows={2} />}

      {providers && providers.length === 0 && !isAdding && (
        <EmptyState
          variant="inline"
          icon={Bike}
          title="No couriers yet"
          description="Add the delivery services you use — your own rider counts, and needs no tracking number."
        />
      )}

      {providers && providers.length > 0 && (
        <div className="flex flex-col gap-2">
          {providers.map((provider) => (
            <DeliveryProviderRow key={provider.id} provider={provider} />
          ))}
        </div>
      )}

      {isAdding ? (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label className="flex flex-col items-stretch gap-1">
              <span className="text-sm font-normal">Name</span>
              <Input
                type="text"
                autoFocus
                value={name}
                placeholder="Royal Express, our own rider…"
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

          <ApiErrorState
            error={nameMessage ? null : create.error}
            fallback="Something went wrong. Please try again."
          />

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={create.isPending} className={controls.buttonSm}>
              {create.isPending ? "Adding..." : "Add courier"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAdding(false)}
              className={controls.buttonSm}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={openAddForm}
          className={`${controls.buttonSm} w-fit`}
        >
          <Plus className="size-4" />
          Add courier
        </Button>
      )}
    </SettingsSection>
  );
}
