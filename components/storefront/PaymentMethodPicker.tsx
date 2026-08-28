"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImagePlus, X } from "lucide-react";
import { storefrontType } from "@/lib/design-tokens";
import type { PublicPaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

// The backend rules payment_proof at 2MB, same as every other upload here.
// Non-blocking client-side, like the admin pickers: this is an early
// heads-up, the server is the real enforcement.
const MAX_PROOF_BYTES = 2048 * 1024;

interface PaymentMethodPickerProps {
  methods: PublicPaymentMethod[];
  selected: string | null;
  onSelect: (method: string) => void;
  proof: File | null;
  onProofChange: (file: File | null) => void;
  disabled?: boolean;
}

export function PaymentMethodPicker({
  methods,
  selected,
  onSelect,
  proof,
  onProofChange,
  disabled = false,
}: PaymentMethodPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const active = methods.find((m) => m.method === selected) ?? null;

  // Object URLs are a real browser resource — created during render and
  // revoked on change/unmount, the same way the admin image pickers do it.
  const previewUrl = useMemo(
    () => (proof ? URL.createObjectURL(proof) : null),
    [proof],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setWarning(
      file.size > MAX_PROOF_BYTES
        ? "That image is over 2MB and may be rejected. Try a smaller screenshot."
        : null,
    );
    onProofChange(file);
    // Lets the same file be re-picked after removing it.
    if (inputRef.current) inputRef.current.value = "";
  }

  function clearProof() {
    setWarning(null);
    onProofChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className={cn(storefrontType.navLabel, "text-muted-foreground")}>Payment</span>

      <div className="flex flex-col gap-2">
        {methods.map((method) => {
          const isSelected = method.method === selected;
          return (
            <button
              key={method.method}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(method.method)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all disabled:opacity-50",
                isSelected
                  ? "border-storefront-ink bg-storefront-ink/5 font-medium text-storefront-ink"
                  : "border-black/10 bg-white text-storefront-ink hover:border-storefront-ink/50",
              )}
            >
              <span
                className={cn(
                  "grid size-4.5 shrink-0 place-items-center rounded-full border transition-colors",
                  isSelected ? "border-storefront-ink bg-storefront-ink" : "border-black/25",
                )}
                aria-hidden="true"
              >
                {isSelected && <Check className="size-3 text-storefront-bg" />}
              </span>
              {method.label}
            </button>
          );
        })}
      </div>

      {/* Keys are omitted rather than nulled on this endpoint, so each of
          these is a presence check, not a truthiness check on a known key. */}
      {active?.qr_url && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-black/10 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- qr_url is already a full URL from the backend */}
          <img
            src={active.qr_url}
            alt={`${active.label} QR code`}
            className="size-44 object-contain"
          />
          <span className="text-xs text-muted-foreground">Scan to pay</span>
        </div>
      )}

      {active?.instructions && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-storefront-ink">
          {active.instructions}
        </p>
      )}

      {active?.requires_proof && (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />

          {previewUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image doesn't apply */}
              <img
                src={previewUrl}
                alt=""
                className="size-12 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-storefront-ink">
                {proof?.name}
              </span>
              <button
                type="button"
                onClick={clearProof}
                aria-label="Remove screenshot"
                className="-m-1 shrink-0 p-1 text-muted-foreground transition-colors hover:text-storefront-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-storefront-ink/50 hover:text-storefront-ink disabled:opacity-50"
            >
              <ImagePlus className="size-4 shrink-0" />
              Attach payment screenshot
            </button>
          )}

          {/* Deliberately not required: a customer may well pay after
              ordering, and a missing screenshot must never block checkout. */}
          <span className="text-xs text-muted-foreground">
            Optional — you can also send it after ordering.
          </span>
          {warning && <span className="text-xs text-amber-700">{warning}</span>}
        </div>
      )}
    </div>
  );
}
