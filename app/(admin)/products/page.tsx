"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useProductsPage, type ProductFilterParams } from "@/lib/hooks/useProductsPage";
import { useCategories } from "@/lib/hooks/useCategories";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Product } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductFilterBar, type ActiveStatus } from "@/components/admin/ProductFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getPageNumbers } from "@/lib/pagination";
import { productStatusStyles } from "@/lib/design-tokens";

const PER_PAGE_OPTIONS = [10, 25, 50] as const;

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function variantSummary(product: Product): string {
  const count = product.variants.length;
  if (count === 0) return "No variants";

  const prices = product.variants.map((v) => Number(v.selling_price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range =
    min === max
      ? priceFormatter.format(min)
      : `${priceFormatter.format(min)} – ${priceFormatter.format(max)}`;

  if (count === 1) return range;
  return `${count} variants · ${range}`;
}

// Untracked variants (track_stock: false) are excluded from the sum — their
// current_stock isn't a meaningful count (unlimited/not managed), so
// including it would silently overstate what's actually on hand.
function stockSummary(product: Product): string {
  if (product.variants.length === 0) return "—";

  const tracked = product.variants.filter((v) => v.track_stock);
  if (tracked.length === 0) return "Not tracked";

  const total = tracked.reduce((sum, v) => sum + Number(v.current_stock), 0);
  return String(total);
}

const addProductLink = (
  <Link href="/products/new" className={buttonVariants({ size: "sm" })}>
    Add product
  </Link>
);

// Same destination, default (larger) size — an empty state's CTA is the
// screen's only affordance, so it reads as the hero rather than a
// toolbar button.
const addFirstProductLink = (
  <Link href="/products/new" className={buttonVariants()}>
    Add your first product
  </Link>
);

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(PER_PAGE_OPTIONS[0]);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const filters: ProductFilterParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId !== null ? { category_id: categoryId } : {}),
    ...(activeStatus !== "all" ? { is_active: activeStatus === "active" ? "true" : "false" } : {}),
    ...(lowStockOnly ? { low_stock: "true" as const } : {}),
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) || categoryId !== null || activeStatus !== "all" || lowStockOnly;

  // Any filter settling to a new value invalidates the current page. This is
  // a render-phase adjustment (React's documented "adjusting state when a
  // prop changes" pattern), not an effect: React discards this render and
  // re-runs the component before committing, so useProductsPage below is
  // never committed holding the stale page with the new filters — which as
  // an effect meant a render, and a query key, for a page nobody asked for.
  //
  // handlePerPageChange keeps its own setPage(1): two independent triggers
  // for the same reset, not one shared rule.
  const filterKey = JSON.stringify(filters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data: response, isPending, isFetching, error: queryError } = useProductsPage(
    page,
    perPage,
    filters,
  );
  const products = response?.data;
  const meta = response?.meta;
  const isEmpty = products !== undefined && products.length === 0;

  const { data: categories } = useCategories();
  const categoryNameById = new Map(categories?.map((c) => [c.id, c.name]));

  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Something went wrong. Please try again."
    : null;

  function clearFilters() {
    setSearchInput("");
    setCategoryId(null);
    setActiveStatus("all");
    setLowStockOnly(false);
  }

  function handlePerPageChange(value: string | null) {
    if (!value) return;
    setPerPage(Number(value));
    setPage(1);
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-6">
        {/* While the list is genuinely empty the empty state below owns the
            "Add product" CTA, so the header drops its copy of it — otherwise
            the screen shows the same button twice. A filtered-to-nothing
            list keeps the header button, since the shop does have products. */}
        <PageHeader
          title="Products"
          action={isEmpty && !hasActiveFilters ? undefined : addProductLink}
        />

        {/* Nothing to filter when the shop has no products at all — the
            controls would just be dead chrome above the empty state. */}
        {!(isEmpty && !hasActiveFilters) && (
          <ProductFilterBar
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            activeStatus={activeStatus}
            onActiveStatusChange={setActiveStatus}
            lowStockOnly={lowStockOnly}
            onLowStockOnlyChange={setLowStockOnly}
            isFetching={isFetching && !isPending}
          />
        )}

        {error && <ErrorState message={error} />}

        {!error && isPending && (
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4" />
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={7} />
              </TableBody>
            </Table>
          </TableCard>
        )}

        {isEmpty &&
          (hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title="No products match your filters"
              description="Try a different search term, or clear the filters to see everything in this shop."
              action={
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product and it will show up here, in the POS, and on your storefront."
              action={addFirstProductLink}
            />
          ))}

        {products !== undefined && products.length > 0 && (
          <TableCard>
            <Table className={cn(isFetching && !isPending && "opacity-60 transition-opacity")}>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4" />
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className={cn(!product.is_active && "bg-muted/30")}
                  >
                    <TableCell className="py-3.5 pl-4">
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- images[].url is already a full URL from the backend, next/image doesn't apply
                        <img
                          src={product.images[0].url}
                          alt=""
                          className={cn(
                            "size-10 rounded-lg object-cover ring-1 ring-border",
                            !product.is_active && "opacity-60 grayscale",
                          )}
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-muted" />
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "py-3.5 font-medium",
                        !product.is_active && "text-muted-foreground",
                      )}
                    >
                      {product.name}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              productStatusStyles.active.dotClassName,
                            )}
                            aria-hidden="true"
                          />
                          {productStatusStyles.active.label}
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className={productStatusStyles.inactive.badgeClassName}
                        >
                          {productStatusStyles.inactive.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">
                      {product.category_id ? (categoryNameById.get(product.category_id) ?? `Category #${product.category_id}`) : "—"}
                    </TableCell>
                    <TableCell className="py-3.5 tabular-nums">{variantSummary(product)}</TableCell>
                    <TableCell className="py-3.5 tabular-nums">{stockSummary(product)}</TableCell>
                    <TableCell className="py-3.5 pr-4 text-right">
                      <Link
                        href={`/products/${product.id}`}
                        className={buttonVariants({ variant: "link", size: "sm", className: "h-auto p-0" })}
                      >
                        Edit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        )}

        {meta && meta.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {meta.from}–{meta.to} of {meta.total}
              </span>
              <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                <SelectTrigger size="sm" className="w-27.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {meta.last_page > 1 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                    />
                  </PaginationItem>

                  {getPageNumbers(page, meta.last_page).map((entry, i) =>
                    entry === "ellipsis" ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={entry}>
                        <PaginationLink
                          href="#"
                          isActive={entry === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(entry);
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
                      className={page === meta.last_page ? "pointer-events-none opacity-50" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < meta.last_page) setPage(page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
