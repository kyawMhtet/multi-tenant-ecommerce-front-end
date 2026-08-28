import { ProductGridSkeleton } from "@/components/storefront/ProductGrid";

/**
 * Full-page placeholder while GET /api/v1/public/shop resolves (the home
 * page needs the shop for its nav, hero and footer). Mirrors the real
 * shape — a tall dark hero band, the sticky filter bar, then the grid — so
 * the page doesn't lurch when the shop and first products land.
 */
export function StorefrontHomeSkeleton() {
  return (
    <>
      {/* Matches StorefrontHero's own height clamp so the page doesn't jump
          when the shop lands. */}
      <div className="h-[86svh] max-h-225 min-h-112 w-full animate-pulse bg-storefront-panel sm:min-h-140" />

      <div className="border-b border-black/5 bg-storefront-bg">
        <div className="mx-auto flex w-full max-w-7xl gap-2 px-4 py-3.5 sm:px-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-8">
        <ProductGridSkeleton />
      </div>
    </>
  );
}
