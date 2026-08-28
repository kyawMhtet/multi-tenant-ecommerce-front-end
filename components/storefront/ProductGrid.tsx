import { ProductCard } from "@/components/storefront/ProductCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { storefrontType } from "@/lib/design-tokens";
import type { StorefrontListProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRID_CLASS =
  "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-4";

export function ProductGridSkeleton() {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-4/5 w-full animate-pulse rounded-md bg-muted" />
          <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3.5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

interface ProductGridProps {
  // undefined while the first page is still loading; [] is a real "no
  // results" answer.
  products: StorefrontListProduct[] | undefined;
  // Threaded down to the cards: list items carry no `shop` key of their own.
  currency: string | null;
  isPending: boolean;
  // Shown above the grid, not instead of it — a failed filter-change
  // refetch still leaves the previous results (kept by keepPreviousData) worth showing.
  errorMessage: string | null;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  // The shown results are stale placeholder data (a filter change is
  // refetching) — dim them until the new page lands.
  isDimmed: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function ProductGrid({
  products,
  currency,
  isPending,
  errorMessage,
  hasActiveFilters,
  onClearFilters,
  isDimmed,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ProductGridProps) {
  return (
    <div className="flex flex-col gap-10">
      {errorMessage && <ErrorState message={errorMessage} />}

      {isPending || !products ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className={cn(storefrontType.sectionHeading, "text-storefront-ink")}>
            {hasActiveFilters ? "Nothing matches" : "Nothing here yet"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try a different search or category."
              : "This shop hasn't added any products yet. Check back soon."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className={cn(
                storefrontType.navLabel,
                "mt-1 border-b-2 border-storefront-ink pb-1 text-storefront-ink transition-opacity hover:opacity-60",
              )}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={cn(GRID_CLASS, isDimmed && "opacity-50 transition-opacity")}>
            {products.map((product, i) => (
              <ProductCard
                key={product.variants[0].slug}
                product={product}
                currency={currency}
                index={i}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className={cn(
                  storefrontType.navLabel,
                  "rounded-xl border border-storefront-ink px-10 py-4 text-storefront-ink transition-colors hover:bg-storefront-ink hover:text-storefront-bg disabled:opacity-50",
                )}
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
