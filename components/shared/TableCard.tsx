// A plain bordered/shadowed surface for table (or table-like list) content
// — deliberately not built on components/ui/card.tsx. Card's padding is
// driven by a --card-spacing custom property intended for CardContent's
// uniform inset, which fights any attempt at edge-to-edge table content;
// trying to override it per-usage produced inconsistent insets across
// different table screens. This owns its own padding rules once, so every
// table-in-a-card looks the same.
interface TableCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function TableCard({ title, action, children }: TableCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {(title || action) && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
