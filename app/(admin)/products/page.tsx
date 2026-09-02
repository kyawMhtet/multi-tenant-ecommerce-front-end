"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageOff, Package, Plus, SearchX } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useProductsPage, type ProductFilterParams } from "@/lib/hooks/useProductsPage";
import { useCategories } from "@/lib/hooks/useCategories";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Product } from "@/lib/types";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { TablePagination } from "@/components/shared/TablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProductFilterBar, type ActiveStatus } from "@/components/admin/ProductFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { controls, productStatusStyles, statusPill, typography } from "@/lib/design-tokens";
import { totalBackorderedUnits } from "@/lib/stock";
import { BackorderBadge } from "@/components/admin/BackorderBadge";

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
//
// The total is deliberately NOT clamped at zero: a preordered variant's
// negative stock is real, and a product whose only variant sits at -7 has
// to read as -7. `unitsOwed` is the separate, positive figure — a product
// with +10 of one variant and -7 of another nets to 3, and that 3 would
// otherwise hide seven customers waiting.
function stockSummary(product: Product): { label: string; unitsOwed: number } {
  const unitsOwed = totalBackorderedUnits(product.variants);

  if (product.variants.length === 0) return { label: "—", unitsOwed };

  const tracked = product.variants.filter((v) => v.track_stock);
  if (tracked.length === 0) return { label: "Not tracked", unitsOwed };

  const total = tracked.reduce((sum, v) => sum + Number(v.current_stock), 0);
  return { label: String(total), unitsOwed };
}

// The table's column set, declared once — the loading skeleton and the real
// table have to agree on it or the header visibly reshuffles the moment
// data lands.
const COLUMNS = ["Product", "Status", "Price", "Stock", ""] as const;

function ProductTableHead() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNS.map((column, i) => (
          <TableHead key={i} className={i === COLUMNS.length - 1 ? "text-right" : undefined}>
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

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

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setPage(1);
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-5">
        {/* While the list is genuinely empty the empty state below owns the
            "Add product" CTA, so the header drops its copy of it — otherwise
            the screen shows the same button twice. A filtered-to-nothing
            list keeps the header button, since the shop does have products. */}
        <PageHeader
          title="Products"
          description={
            meta && meta.total > 0
              ? `${meta.total} ${meta.total === 1 ? "product" : "products"} ${
                  hasActiveFilters ? "match your filters" : "in this shop"
                }`
              : undefined
          }
          action={
            isEmpty && !hasActiveFilters ? undefined : (
              <Link href="/products/new" className={cn(buttonVariants(), controls.button)}>
                <Plus className="size-4" />
                Add product
              </Link>
            )
          }
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
            onClear={clearFilters}
            isFiltered={hasActiveFilters}
          />
        )}

        {error && <ErrorState message={error} />}

        {!error && isPending && (
          <TableCard>
            <Table>
              <ProductTableHead />
              <TableBody>
                <TableSkeleton columns={COLUMNS.length} />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className={controls.button}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product and it will show up here, in the POS, and on your storefront."
              action={
                <Link href="/products/new" className={cn(buttonVariants(), controls.button)}>
                  Add your first product
                </Link>
              }
            />
          ))}

        {products !== undefined && products.length > 0 && meta && (
          <TableCard
            footer={
              <TablePagination
                meta={meta}
                page={page}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={PER_PAGE_OPTIONS}
                label="products"
              />
            }
          >
            <Table className={cn(isFetching && !isPending && "opacity-60 transition-opacity")}>
              <ProductTableHead />
              <TableBody>
                {products.map((product) => {
                  const { label: stockLabel, unitsOwed } = stockSummary(product);
                  const categoryName = product.category_id
                    ? (categoryNameById.get(product.category_id) ?? `Category #${product.category_id}`)
                    : null;

                  return (
                    <TableRow key={product.id} className="group">
                      {/* Thumbnail, name and category in one cell rather than
                          three columns. The category was its own column and
                          spent most of its width empty; as the name's second
                          line it still scans, and the row loses a column of
                          dead space. */}
                      <TableCell>
                        <div className="flex items-center gap-3.5">
                          {product.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element -- images[].url is already a full URL from the backend, next/image doesn't apply
                            <img
                              src={product.images[0].url}
                              alt=""
                              className={cn(
                                "size-11 shrink-0 rounded-xl object-cover ring-1 ring-border",
                                !product.is_active && "opacity-60 grayscale",
                              )}
                            />
                          ) : (
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                              <ImageOff className="size-4" />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span
                              className={cn(
                                "truncate font-medium",
                                !product.is_active && "text-muted-foreground",
                              )}
                            >
                              {product.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {categoryName ?? "Uncategorised"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
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
                            variant="secondary"
                            className={cn(statusPill, productStatusStyles.inactive.badgeClassName)}
                          >
                            {productStatusStyles.inactive.label}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className={typography.numeric}>{variantSummary(product)}</TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={typography.numeric}>{stockLabel}</span>
                          <BackorderBadge units={unitsOwed} />
                        </div>
                      </TableCell>

                      {/* Quiet by default, solid on row hover — deliberately
                          NOT hidden until hover, which would leave the only
                          action on the row unreachable on a touch screen
                          (there is no hover to trigger). */}
                      <TableCell className="text-right">
                        <Link
                          href={`/products/${product.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            controls.buttonSm,
                            "text-muted-foreground group-hover:bg-background group-hover:text-foreground",
                          )}
                        >
                          Edit
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </div>
    </PageContainer>
  );
}
