"use client";

import { ExternalLink, Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt: string;
  // Shown as the dialog's heading — also what makes the dialog accessible,
  // so it isn't optional.
  title: string;
  // Height of the inline thumbnail. The dialog is always large.
  thumbnailClassName?: string;
}

/**
 * A thumbnail that opens the full image in an overlay rather than a new tab.
 * Used for payment screenshots on the order screen: the shop is comparing
 * the image against the order right there, so sending them to another tab
 * loses the order beside it.
 *
 * The original is still one click away inside the dialog — a phone
 * screenshot can be taller than any overlay, and pinch-zoom on the real file
 * is the only way to read the small print on some of them.
 *
 * In shared/ because the platform console reviews transfer screenshots the
 * same way the shop reviews a customer's: side by side with the record it is
 * supposed to match, without losing that record to another tab.
 */
export function ImageLightbox({
  src,
  alt,
  title,
  thumbnailClassName,
}: ImageLightboxProps) {
  return (
    <Dialog>
      <DialogTrigger className="group relative w-fit cursor-zoom-in overflow-hidden rounded-lg border bg-muted transition-colors hover:border-primary">
        {/* eslint-disable-next-line @next/next/no-img-element -- external, per-tenant image host; no next.config.ts remotePatterns set up for it */}
        <img
          src={src}
          alt={alt}
          className={cn("w-auto max-w-full object-contain", thumbnailClassName ?? "max-h-72")}
        />
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="size-3" />
          Expand
        </span>
      </DialogTrigger>

      {/* Wider than the default dialog and padded tight — at this size the
          image is the content, not an illustration inside a form. */}
      <DialogContent className="w-full gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center overflow-auto rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
          <img src={src} alt={alt} className="max-h-[70vh] w-auto object-contain" />
        </div>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Open original
        </a>
      </DialogContent>
    </Dialog>
  );
}
