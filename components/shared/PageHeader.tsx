import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { typography } from "@/lib/design-tokens";

interface PageHeaderProps {
  title: string;
  description?: string;
  // A short label above the title naming the section or the record's
  // context ("Dashboard", "Order #1042"). Optional, and worth using only
  // where the title alone leaves you guessing where you are.
  eyebrow?: string;
  action?: React.ReactNode;
  // Set on nested pages (e.g. /products/[id], /orders/[id]) so they link
  // back to the list/screen they were reached from, with a label naming
  // that destination (e.g. "Back to products") — top-level pages reachable
  // directly from the sidebar (Dashboard, Products, POS, Reports) never
  // set this.
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  backHref,
  backLabel,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {backHref && (
        <Link
          href={backHref}
          className="group inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow && <span className={typography.microLabel}>{eyebrow}</span>}
          <h1 className={typography.pageTitle}>{title}</h1>
          {description && <p className={typography.muted}>{description}</p>}
        </div>
        {/* Actions align to the bottom of the title block (items-end) so a
            button sits on the title's baseline rather than floating beside
            a two-line heading. */}
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
