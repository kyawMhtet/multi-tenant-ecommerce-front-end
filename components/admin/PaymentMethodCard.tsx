"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CameraIcon, QrCodeIcon } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useUpsertPaymentMethod } from "@/lib/hooks/useUpsertPaymentMethod";
import { ShopImageField, type ShopImageFieldValue } from "@/components/admin/ShopImageField";
import { ErrorState } from "@/components/shared/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentMethodConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DraftState {
  isEnabled: boolean;
  instructions: string;
  qr: ShopImageFieldValue;
}

function draftFromMethod(method: PaymentMethodConfig): DraftState {
  return {
    isEnabled: method.is_enabled,
    instructions: method.instructions ?? "",
    qr: { file: null, remove: false },
  };
}

interface PaymentMethodCardProps {
  method: PaymentMethodConfig;
  // Rendered in place of the enable toggle when the method can't be turned
  // on yet — the card row passes its Stripe connect flow through here rather
  // than this component knowing what Stripe is.
  blockedReason?: string;
  blockedAction?: React.ReactNode;
}

export function PaymentMethodCard({
  method,
  blockedReason,
  blockedAction,
}: PaymentMethodCardProps) {
  const [draft, setDraft] = useState<DraftState>(() => draftFromMethod(method));
  const upsert = useUpsertPaymentMethod();

  // Re-seed when the saved row changes identity or content — a refetch after
  // saving brings back the server's version (including the stored qr_url),
  // and the local draft should follow it rather than sit on stale values.
  // Keyed on the saved fields, not the object, since React Query hands back
  // a fresh object on every background refetch.
  const savedKey = `${method.is_enabled}|${method.instructions ?? ""}|${method.qr_url ?? ""}`;
  const [lastSavedKey, setLastSavedKey] = useState(savedKey);
  if (savedKey !== lastSavedKey) {
    setLastSavedKey(savedKey);
    setDraft(draftFromMethod(method));
  }

  const isDirty =
    draft.isEnabled !== method.is_enabled ||
    draft.instructions !== (method.instructions ?? "") ||
    draft.qr.file !== null ||
    draft.qr.remove;

  const isBlocked = Boolean(blockedReason);

  async function handleSave() {
    upsert.reset();
    try {
      await upsert.mutateAsync({
        method: method.method,
        is_enabled: draft.isEnabled,
        // Only sent for methods the shop settles itself — a gateway method
        // has no instructions for anyone to write.
        ...(method.is_manual ? { instructions: draft.instructions.trim() || null } : {}),
        ...(draft.qr.file ? { qr: draft.qr.file } : {}),
        ...(draft.qr.remove ? { remove_qr: true } : {}),
      });
      toast.success(`${method.label} saved.`);
    } catch {
      // Surfaced via saveError below.
    }
  }

  const saveError = upsert.error
    ? upsert.error instanceof ApiError
      ? upsert.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <Card className={cn("shadow-sm", !draft.isEnabled && !isDirty && "bg-muted/20")}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{method.label}</span>
              {method.is_enabled ? (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
                  On
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Off
                </Badge>
              )}
              {method.gateway && (
                <Badge variant="outline" className="capitalize text-muted-foreground">
                  {method.gateway}
                </Badge>
              )}
            </div>

            {method.supports_proof && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CameraIcon className="size-3.5 shrink-0" />
                Customers can attach a payment screenshot at checkout.
              </span>
            )}
          </div>

          {isBlocked ? (
            <div className="flex flex-col items-end gap-1.5">
              {blockedAction}
              <span className="max-w-xs text-right text-xs text-muted-foreground">
                {blockedReason}
              </span>
            </div>
          ) : (
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={draft.isEnabled}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, isEnabled: checked === true }))
                }
              />
              Offer at checkout
            </Label>
          )}
        </div>

        {/* Fields are driven by the row's own capability flags, so a method
            the backend adds later shows the right controls with no change
            here. */}
        {!isBlocked && method.is_manual && (
          <Label className="flex flex-col items-stretch gap-1">
            <span className="text-sm">Instructions for customers</span>
            <Textarea
              rows={2}
              placeholder={
                method.supports_qr
                  ? "e.g. KBZPay 09xxxxxxxxx — send a screenshot after paying."
                  : "e.g. Please have the exact amount ready."
              }
              value={draft.instructions}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, instructions: e.target.value }))
              }
            />
            <span className="text-xs text-muted-foreground">
              Shown on the storefront when a customer picks this method.
            </span>
          </Label>
        )}

        {!isBlocked && method.supports_qr && (
          <ShopImageField
            label="QR code"
            hint="Square image, 2MB max. Customers scan this to pay."
            currentUrl={method.qr_url}
            value={draft.qr}
            onChange={(qr) => setDraft((prev) => ({ ...prev, qr }))}
          />
        )}

        {saveError && <ErrorState message={saveError} />}

        {!isBlocked && (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || upsert.isPending}
              onClick={handleSave}
              className="w-fit"
            >
              {upsert.isPending ? "Saving..." : "Save"}
            </Button>
            {method.supports_qr && !method.qr_url && draft.isEnabled && !draft.qr.file && (
              <span className="flex items-center gap-1.5 text-xs text-amber-700">
                <QrCodeIcon className="size-3.5 shrink-0" />
                No QR uploaded yet — customers will only see your instructions.
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
