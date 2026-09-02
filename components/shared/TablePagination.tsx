"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/lib/types";

type PageMeta = PaginatedResponse<unknown>["meta"];

interface TablePaginationProps {
  meta: PageMeta;
  page: number;
  onPageChange: (page: number) => void;
  // The three below travel together and are all optional: some endpoints
  // (GET /billing/invoices) fix their page size server-side and take no
  // per_page parameter at all. Rendering a size selector there would offer a
  // choice the API doesn't have, so those callers omit them and get the count
  // plus the page links on their own.
  perPage?: number;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: readonly number[];
  // Plural noun for the total ("products", "orders") — "of 24" alone makes
  // the reader work out what's being counted.
  label: string;
}

/**
 * The footer of a paginated list screen: what you're looking at, how many
 * per page, and the page links.
 *
 * Products and orders carried ~55 lines of identical markup for this each,
 * which is how they drifted (same layout, subtly different widths). It also
 * belongs inside the table's card rather than floating under it — page
 * controls are part of the table, not the page.
 */
export function TablePagination({
  meta,
  page,
  onPageChange,
  perPage,
  onPerPageChange,
  perPageOptions,
  label,
}: TablePaginationProps) {
  const showPerPage =
    perPage !== undefined && onPerPageChange !== undefined && perPageOptions !== undefined;

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {meta.from}–{meta.to} of {meta.total} {label}
        </span>
        {showPerPage && (
        <Select
          value={String(perPage)}
          onValueChange={(value) => {
            if (value) onPerPageChange(Number(value));
          }}
        >
          {/* One step down from controls.select: the footer's controls
              support the table rather than driving it, so they sit at 36px
              next to the 40px filter bar above. Same data-attribute prefix
              the trigger uses to size itself — see controls.select. */}
          <SelectTrigger className="w-30 rounded-lg px-3 text-sm data-[size=default]:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {perPageOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}
      </div>

      {meta.last_page > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={cn("h-9 rounded-lg", page === 1 && "pointer-events-none opacity-50")}
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
              />
            </PaginationItem>

            {getPageNumbers(page, meta.last_page).map((entry, i) =>
              entry === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis className="size-9" />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === page}
                    className={cn(
                      "size-9 rounded-lg tabular-nums",
                      entry === page && "border-primary/40 bg-primary/10 text-primary",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(entry);
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === meta.last_page}
                className={cn(
                  "h-9 rounded-lg",
                  page === meta.last_page && "pointer-events-none opacity-50",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < meta.last_page) onPageChange(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
