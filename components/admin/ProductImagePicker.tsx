"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RotateCcwIcon, Trash2Icon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/types";

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 2048 * 1024;

interface ProductImagePickerProps {
  // Already uploaded, ordered by sort_order server-side.
  existingImages?: ProductImage[];
  // Ids marked for removal — purely local state. Nothing is deleted here;
  // the parent form fires the actual DELETE calls on submit and only then
  // clears (or partially clears, on partial failure) this list.
  imagesToDelete?: number[];
  onImagesToDeleteChange?: (ids: number[]) => void;
  // Staged locally, not yet uploaded — freely addable/removable, since
  // removing one here just drops a File object, no request involved.
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  // Section heading — "Photos" for a product, "Variant photos" for a variant.
  title?: string;
  // The small print under the grid. Defaults to product-gallery wording.
  hint?: React.ReactNode;
}

export function ProductImagePicker({
  existingImages = [],
  imagesToDelete = [],
  onImagesToDeleteChange,
  pendingFiles,
  onPendingFilesChange,
  title = "Photos",
  hint,
}: ProductImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Marked-for-removal images are effectively already gone from the user's
  // perspective, even though the DELETE hasn't fired yet — they don't
  // count against the cap.
  const activeExistingCount = existingImages.length - imagesToDelete.length;
  const totalCount = activeExistingCount + pendingFiles.length;
  const roomLeft = MAX_FILES - totalCount;

  // Object URLs are a side effect (real browser resource, needs
  // revoking), so they're created during render via useMemo rather than
  // useState+useEffect — there's no derived-state update to make here,
  // just a value to compute and later clean up.
  const previewUrls = useMemo(() => pendingFiles.map((file) => URL.createObjectURL(file)), [pendingFiles]);
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const accepted = incoming.slice(0, Math.max(roomLeft, 0));
    const oversized = accepted.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (incoming.length > accepted.length) {
      setWarning(
        `Only ${MAX_FILES} photos allowed per product — ${incoming.length - accepted.length} skipped.`,
      );
    } else if (oversized.length > 0) {
      // Non-blocking: the server is the real 2MB enforcement (each file is
      // still added), this is just an early heads-up before hitting submit.
      setWarning(
        `${oversized.length} photo${oversized.length > 1 ? "s are" : " is"} over 2MB and will likely be rejected when you save.`,
      );
    } else {
      setWarning(null);
    }

    onPendingFilesChange([...pendingFiles, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(index: number) {
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
    setWarning(null);
  }

  // Toggle, not a one-way mark: since nothing's actually deleted yet,
  // clicking the same control again is a free undo.
  function toggleMarkedForDeletion(imageId: number) {
    if (!onImagesToDeleteChange) return;
    onImagesToDeleteChange(
      imagesToDelete.includes(imageId)
        ? imagesToDelete.filter((id) => id !== imageId)
        : [...imagesToDelete, imageId],
    );
  }

  // existingImages arrives pre-sorted by sort_order — the cover is the
  // first one that isn't marked for removal, not necessarily index 0.
  // Never assumes sort_order stays contiguous after a real delete; this
  // only ever looks at array position among the currently-active images.
  const firstActiveExistingId = existingImages.find((img) => !imagesToDelete.includes(img.id))?.id;
  const hasActiveExistingCover = firstActiveExistingId !== undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {totalCount} / {MAX_FILES}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {existingImages.map((image) => {
          const isMarked = imagesToDelete.includes(image.id);
          const isCover = !isMarked && image.id === firstActiveExistingId;
          return (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external, per-tenant image host; no next.config.ts remotePatterns set up for it */}
              <img
                src={image.url}
                alt=""
                className={cn("h-full w-full object-cover", isMarked && "opacity-40 grayscale")}
              />
              {isCover && (
                <Badge variant="secondary" className="absolute top-1.5 left-1.5 shadow-sm">
                  Cover
                </Badge>
              )}
              {isMarked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/30">
                  <Trash2Icon className="size-5 text-white" />
                  <button
                    type="button"
                    onClick={() => toggleMarkedForDeletion(image.id)}
                    className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-white"
                  >
                    <RotateCcwIcon className="size-3" />
                    Undo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleMarkedForDeletion(image.id)}
                  aria-label="Mark photo for removal"
                  className="absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {pendingFiles.map((file, index) => (
          <div
            key={`${file.name}-${file.lastModified}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image doesn't apply */}
            <img src={previewUrls[index]} alt="" className="h-full w-full object-cover" />
            {!hasActiveExistingCover && index === 0 && (
              <Badge variant="secondary" className="absolute top-1.5 left-1.5 shadow-sm">
                Cover
              </Badge>
            )}
            <Badge variant="outline" className="absolute top-1.5 right-1.5 bg-background/90 shadow-sm">
              New
            </Badge>
            <button
              type="button"
              onClick={() => removePending(index)}
              aria-label={`Remove ${file.name}`}
              className="absolute right-1.5 bottom-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {roomLeft > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors",
              "hover:border-primary hover:bg-primary/5 hover:text-primary",
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {warning && <span className="text-xs text-amber-700">{warning}</span>}
      {imagesToDelete.length > 0 && (
        <span className="text-xs text-amber-700">
          {imagesToDelete.length} photo{imagesToDelete.length > 1 ? "s" : ""} marked for removal —
          deleted when you save.
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        {hint ?? `Up to ${MAX_FILES} photos, 2MB max each. New photos are added to the gallery.`}
      </span>
    </div>
  );
}
