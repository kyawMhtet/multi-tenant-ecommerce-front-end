"use client";

import { use, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { usePublicProduct } from "@/lib/hooks/usePublicProduct";
import { ErrorState } from "@/components/shared/ErrorState";
import { AddToCartPanel } from "@/components/storefront/AddToCartPanel";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ShopFooter } from "@/components/storefront/ShopFooter";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";

function ProductPageSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="aspect-4/5 w-full animate-pulse rounded-lg bg-muted" />
      <div className="flex flex-col gap-4">
        <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-32 animate-pulse rounded bg-muted" />
        <div className="h-11 w-full animate-pulse rounded bg-muted" />
        <div className="h-13 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function StorefrontProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: product, error: loadErrorObj } = usePublicProduct(slug);
  const [selectedSlug, setSelectedSlug] = useState(slug);

  const loadError =
    loadErrorObj instanceof ApiError && loadErrorObj.status === 404
      ? "This product isn't available."
      : loadErrorObj instanceof ApiError
        ? loadErrorObj.message
        : loadErrorObj
          ? "Could not load this product."
          : null;

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.slug === selectedSlug) ?? product?.variants[0] ?? null,
    [product, selectedSlug],
  );

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <ErrorState message={loadError} />
      </main>
    );
  }

  // The nav/footer below read product.shop — the same payload GET
  // /api/v1/public/shop returns, embedded in the product response. This page
  // is reached by a pasted link with no shop slug in hand, which is exactly
  // why the backend embeds it: calling usePublicShop() here would be a
  // second request for data this screen already has.
  const shell = (children: React.ReactNode) => (
    <>
      {product && <StorefrontNav shop={product.shop} />}
      <main className="flex-1 pt-16">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-16">{children}</div>
      </main>
      {product && <ShopFooter shop={product.shop} />}
    </>
  );

  if (!product || !selectedVariant) {
    return shell(<ProductPageSkeleton />);
  }

  // Variant photos take precedence — the customer picked "Red", show the red
  // photos. A variant with none inherits the product's general gallery
  // (the fallback is a frontend call, not the API's).
  const galleryImages =
    selectedVariant.images.length > 0 ? selectedVariant.images : product.images;

  return shell(
    <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
      <div className="lg:sticky lg:top-24">
        <ProductGallery images={galleryImages} productName={product.name} />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] text-storefront-ink text-balance sm:text-4xl">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          )}
        </div>

        <AddToCartPanel
          product={product}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedSlug}
        />
      </div>
    </div>,
  );
}
