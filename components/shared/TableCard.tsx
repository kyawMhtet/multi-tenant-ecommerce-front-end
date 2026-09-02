import { typography, surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// A bordered surface for table (or table-like list) content — deliberately
// not built on components/ui/card.tsx. Card's padding is driven by a
// --card-spacing custom property intended for CardContent's uniform inset,
// which fights any attempt at edge-to-edge table content; trying to
// override it per-usage produced inconsistent insets across different table
// screens.
//
// It owns the density of the table inside it, not just the box around it.
// Every screen used to re-declare `py-3.5 pl-4` on each <TableCell> and
// `pl-4`/`pr-4` on the edge <TableHead>s, which meant seven screens each
// drifting a little — and no single place to change how a row feels. These
// descendant rules set it once:
//
//   - a tinted header strip with small-caps labels, so the column names
//     stop competing with the data underneath them;
//   - one 20px gutter (px-5) shared by the header, the rows, and the
//     div-based lists that sit in this same card on the dashboard;
//   - 16px row padding, up from 14px — the single biggest reason the old
//     tables read as "unstyled spreadsheet".
//
// Descendant selectors outrank a utility class on specificity, so a cell
// that still carries its own `pl-4` loses to the rule here. That's the
// point (uniformity), but it also means a genuinely special-cased cell has
// to raise specificity or be handled with a prop — not by adding a
// padding utility that will silently do nothing.
const tableDensity = [
  "[&_thead]:bg-muted/40",
  "[&_thead_th]:h-11 [&_thead_th]:px-5 [&_thead_th]:text-[0.6875rem] [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.09em] [&_thead_th]:text-muted-foreground [&_thead_th]:uppercase",
  "[&_tbody_td]:px-5 [&_tbody_td]:py-4",
].join(" ");

interface TableCardProps {
  title?: string;
  // A second line under the title — say what the panel is counting or
  // scoping, not what it obviously is.
  description?: string;
  action?: React.ReactNode;
  // Sits under the table, inside the same border — pagination, totals.
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function TableCard({
  title,
  description,
  action,
  footer,
  className,
  children,
}: TableCardProps) {
  return (
    <div className={cn(surface.panel, "overflow-hidden", tableDensity, className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b px-5 py-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && <h2 className={typography.sectionHeading}>{title}</h2>}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}

      {children}

      {footer && <div className="border-t bg-muted/30 px-5 py-3">{footer}</div>}
    </div>
  );
}
