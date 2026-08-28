import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { typography } from "@/lib/design-tokens";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  // Set on nested pages (e.g. /products/[id], /orders/[id]) so they link
  // back to the list/screen they were reached from, with a label naming
  // that destination (e.g. "Back to products") — top-level pages reachable
  // directly from the sidebar (Dashboard, Products, POS, Reports) never
  // set this.
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({ title, description, action, backHref, backLabel }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className={typography.pageTitle}>{title}</h1>
          {description && <p className={typography.muted}>{description}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
