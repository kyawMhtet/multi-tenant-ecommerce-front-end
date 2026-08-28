"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { usePublicCategories } from "@/lib/hooks/usePublicCategories";
import { usePublicProducts, type PublicProductsFilters } from "@/lib/hooks/usePublicProducts";
import { usePublicShop } from "@/lib/hooks/usePublicShop";
import { ErrorState } from "@/components/shared/ErrorState";
import { CatalogFilters } from "@/components/storefront/CatalogFilters";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { ShopFooter } from "@/components/storefront/ShopFooter";
import { StorefrontHero } from "@/components/storefront/StorefrontHero";
import { StorefrontHomeSkeleton } from "@/components/storefront/StorefrontHomeSkeleton";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";

/**
 * The shop's storefront home — "/" on a tenant subdomain. usePublicShop
 * resolves which shop that is from the host, so this page takes no params;
 * the catalog and category list are fetched the same subdomain-scoped way.
 *
 * Layout: a full-bleed hero, then the catalogue (sticky category + search
 * bar over the product grid), then the shop's own details in the footer.
 */
export default function ShopHomePage() {
  const { data: shop, error: shopErrorObj } = usePublicShop();
  const { data: categories } = usePublicCategories();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const filters: PublicProductsFilters = {
    ...(search ? { search } : {}),
    ...(categoryId !== null ? { category_id: categoryId } : {}),
  };
  const hasActiveFilters = Boolean(search) || categoryId !== null;

  const {
    data,
    isPending,
    error: productsErrorObj,
    isPlaceholderData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = usePublicProducts(filters);

  // useInfiniteQuery hands back a page-of-pages; the grid wants one flat list.
  const products = data?.pages.flatMap((page) => page.data);

  function clearFilters() {
    setSearchInput("");
    setCategoryId(null);
  }

  const shopError =
    shopErrorObj instanceof ApiError && shopErrorObj.status === 404
      ? "This shop isn't available."
      : shopErrorObj instanceof ApiError
        ? shopErrorObj.message
        : shopErrorObj
          ? "Could not load this shop."
          : null;

  const productsError =
    productsErrorObj instanceof ApiError
      ? productsErrorObj.message
      : productsErrorObj
        ? "Could not load products. Please try again."
        : null;

  if (shopError) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <ErrorState message={shopError} />
      </main>
    );
  }

  if (!shop) {
    return <StorefrontHomeSkeleton />;
  }

  return (
    <>
      <StorefrontNav shop={shop} overHero />
      <StorefrontHero shop={shop} />

      <main id="catalog" className="scroll-mt-16">
        <CatalogFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          categories={categories ?? []}
          activeCategoryId={categoryId}
          onCategoryChange={setCategoryId}
        />

        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
          <ProductGrid
            products={products}
            currency={shop.currency}
            isPending={isPending}
            errorMessage={productsError}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            isDimmed={isPlaceholderData}
            hasMore={hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
        </div>
      </main>

      <ShopFooter shop={shop} />
    </>
  );
}
