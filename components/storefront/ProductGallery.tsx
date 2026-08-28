"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  // The effective image set for the current selection — the selected
  // variant's own photos when it has any, otherwise the product's general
  // gallery. The parent decides which; this just displays them.
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);

  // Reset to the first photo whenever the image set changes (a variant
  // switch brings in a different set). Render-phase adjustment, not an
  // effect — same pattern as the products list's page reset.
  const firstId = images[0]?.id ?? null;
  const [lastFirstId, setLastFirstId] = useState(firstId);
  if (firstId !== lastFirstId) {
    setLastFirstId(firstId);
    setIndex(0);
  }

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      {/* Square, not 4:5 — in the two-column layout a portrait frame runs
          far taller than the buy panel beside it and strands a void under
          the right column. object-contain on a soft ground so a photo of
          any aspect sits inside the frame uncropped. */}
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-black/5 bg-white">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element -- images[].url is already a full URL from the backend
          <img
            src={current.url}
            alt={productName}
            className="size-full object-contain"
          />
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "aspect-square w-18 shrink-0 overflow-hidden rounded-xl border bg-white p-1 transition",
                i === index
                  ? "border-storefront-ink"
                  : "border-black/10 opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- backend URL */}
              <img src={image.url} alt="" className="size-full rounded-lg object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
