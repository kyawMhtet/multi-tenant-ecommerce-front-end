import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

// Drop-in replacement for a table's real `.map()` rows while data is
// loading — meant to sit inside an unchanged, already-real <TableHeader>
// (column labels are static strings, not fetched data, so they can render
// correctly on first paint with zero layout shift once real rows replace
// these).
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r}>
          {Array.from({ length: columns }, (_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full max-w-32" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
