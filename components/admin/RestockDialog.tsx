"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useRestockVariant } from "@/lib/hooks/useRestockVariant";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/ErrorState";
import type { ProductVariant } from "@/lib/types";

interface RestockFormState {
  quantity: string;
  unitCost: string;
  note: string;
}

const initialForm: RestockFormState = { quantity: "", unitCost: "", note: "" };

function validate(form: RestockFormState): Partial<Record<keyof RestockFormState, string>> {
  const errors: Partial<Record<keyof RestockFormState, string>> = {};

  const quantity = Number(form.quantity);
  if (!form.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = "Quantity must be a positive number.";
  }

  if (form.unitCost.trim()) {
    const unitCost = Number(form.unitCost);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      errors.unitCost = "Unit cost must be zero or a positive number.";
    }
  }

  return errors;
}

interface RestockDialogProps {
  productId: string;
  variant: ProductVariant;
}

export function RestockDialog({ productId, variant }: RestockDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RestockFormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RestockFormState, string>>>({});
  const restock = useRestockVariant();

  function updateField<K extends keyof RestockFormState>(key: K, value: RestockFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm(initialForm);
      setErrors({});
      restock.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    restock.reset();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const updated = await restock.mutateAsync({
        productId,
        variantId: variant.id,
        data: {
          quantity: Number(form.quantity),
          // Omit entirely when blank — sending it updates buying_price
          // going forward, so leaving cost unknown for this delivery must
          // not silently touch the variant's cost basis.
          unit_cost: form.unitCost.trim() ? Number(form.unitCost) : undefined,
          note: form.note.trim() || undefined,
        },
      });
      toast.success(`Restocked — now ${Number(updated.current_stock)} in stock.`);
      setOpen(false);
    } catch {
      // Surfaced via submitError below.
    }
  }

  const submitError = restock.error
    ? restock.error instanceof ApiError
      ? restock.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button type="button" variant="link" size="sm" className="h-auto p-0" />}
      >
        Restock
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Restock variant</DialogTitle>
        </DialogHeader>
 
        <p className="text-sm text-muted-foreground">
          Current stock: <span className="tabular-nums">{Number(variant.current_stock)}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm">Quantity received</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.quantity}
              onChange={(e) => updateField("quantity", e.target.value)}
            />
            {errors.quantity && (
              <span className="text-sm text-destructive">{errors.quantity}</span>
            )}
          </Label>

          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm">Unit cost (optional)</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Leave blank if unknown"
              value={form.unitCost}
              onChange={(e) => updateField("unitCost", e.target.value)}
            />
            {errors.unitCost && (
              <span className="text-sm text-destructive">{errors.unitCost}</span>
            )}
            <span className="text-xs text-muted-foreground">
              Updates this variant&apos;s buying price going forward. Leave blank to keep the
              current buying price unchanged.
            </span>
          </Label>

          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm">Note (optional)</span>
            <Textarea
              placeholder="Supplier name, invoice #, etc."
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </Label>

          {submitError && <ErrorState message={submitError} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={restock.isPending}>
              {restock.isPending ? "Saving..." : "Restock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
