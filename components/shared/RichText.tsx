"use client";

import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface RichTextProps {
  html: string;
  className?: string;
}

export function RichText({ html, className }: RichTextProps) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-muted-foreground [&>ol]:my-3 [&>ol]:list-decimal [&>ol]:pl-6 [&>p]:my-3 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>ul]:my-3 [&>ul]:list-disc [&>ul]:pl-6 [&_a]:text-primary [&_a]:underline",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}