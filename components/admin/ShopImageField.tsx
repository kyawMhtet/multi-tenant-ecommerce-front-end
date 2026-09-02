"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { controls } from "@/lib/design-tokens";

// UpdateTenantRequest rules both files as 'image', 'max:2048' — kilobytes,
// so 2MB. Same non-blocking treatment as ProductImagePicker: the server is
// the real enforcement, this is just an early heads-up.
const MAX_FILE_SIZE_BYTES = 2048 * 1024;

/**
 * One image slot's local state. Deliberately a single value with two
 * mutually exclusive arms rather than two independent booleans: sending a
 * file and its remove flag together is a 422 server-side (Rule::prohibitedIf
 * on remove_logo/remove_cover), not a last-one-wins, so the exclusivity is
 * enforced here — in the only place both are set — instead of being left to
 * every caller to remember.
 */
export interface ShopImageFieldValue {
  file: File | null;
  remove: boolean;
}

interface ShopImageFieldProps {
  label: string;
  hint: string;
  // null whenever the shop has never uploaded one — every profile field on
  // TenantResource is nullable.
  currentUrl: string | null;
  value: ShopImageFieldValue;
  onChange: (value: ShopImageFieldValue) => void;
  // Logos read as an avatar, covers as a banner — same control, different
  // preview box so what you see matches what the storefront renders.
  shape?: "square" | "wide";
  error?: string;
}

export function ShopImageField({
  label,
  hint,
  currentUrl,
  value,
  onChange,
  shape = "square",
  error,
}: ShopImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Object URLs are a real browser resource that needs revoking, so the URL
  // is computed during render via useMemo and cleaned up in an effect —
  // the same approach ProductImagePicker uses for its pending files.
  const previewUrl = useMemo(
    () => (value.file ? URL.createObjectURL(value.file) : null),
    [value.file],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setWarning(
      file.size > MAX_FILE_SIZE_BYTES
        ? "That image is over 2MB and will likely be rejected when you save."
        : null,
    );
    // Choosing a file cancels a pending removal — this is the half of the
    // exclusivity rule that runs when the user picks the file second.
    onChange({ file, remove: false });
    // Lets the same file be re-picked after an undo; without this the input
    // holds the old value and fires no change event.
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove() {
    setWarning(null);
    // ...and this is the other half: asking for removal drops any staged
    // file, so the two can never both be pending.
    onChange({ file: null, remove: true });
  }

  function handleUndo() {
    setWarning(null);
    onChange({ file: null, remove: false });
  }

  const isStaged = value.file !== null || value.remove;
  // What the storefront would show if this were saved right now: the new
  // file, nothing at all when removal is pending, otherwise what's stored.
  const shownUrl = previewUrl ?? (value.remove ? null : currentUrl);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border bg-muted",
            shape === "square" ? "size-24" : "h-24 w-64",
          )}
        >
          {shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- either a local object URL or an external, per-tenant image host; next/image applies to neither
            <img src={shownUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              {value.remove ? (
                <Trash2Icon className="size-5" />
              ) : (
                <ImagePlus className="size-5" />
              )}
              <span className="text-xs">{value.remove ? "Removing" : "None"}</span>
            </div>
          )}
          {previewUrl && (
            <Badge
              variant="outline"
              className="absolute top-1.5 left-1.5 bg-background/90 shadow-sm"
            >
              New
            </Badge>
          )}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className={controls.buttonSm}
            >
              {shownUrl ? "Replace" : "Choose image"}
            </Button>

            {/* Only ever one of these two: undo while something's staged,
                remove while there's a stored image and nothing staged.
                Never a "remove" next to a chosen file. */}
            {isStaged ? (
              <Button type="button" variant="ghost" onClick={handleUndo} className={controls.buttonSm}>
                <RotateCcwIcon />
                Undo
              </Button>
            ) : (
              currentUrl && (
                <Button type="button" variant="ghost" onClick={handleRemove} className={controls.buttonSm}>
                  <Trash2Icon />
                  Remove
                </Button>
              )
            )}
          </div>

          <span className="text-xs text-muted-foreground">{hint}</span>
          {value.file && (
            <span className="max-w-full truncate text-xs text-muted-foreground">
              {value.file.name}
            </span>
          )}
          {value.remove && (
            <span className="text-xs text-amber-700">Removed when you save.</span>
          )}
          {warning && <span className="text-xs text-amber-700">{warning}</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files)}
      />
    </div>
  );
}
