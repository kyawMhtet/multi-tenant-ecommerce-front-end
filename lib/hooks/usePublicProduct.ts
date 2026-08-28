"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicProduct } from "@/lib/api/storefront";

export function usePublicProduct(slug: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["storefront-product", slug],
    queryFn: async () => {
      const product = await getPublicProduct(slug);
      // `shop` here is byte-for-byte what GET /api/v1/public/shop returns,
      // so it seeds that cache entry too. The page itself doesn't need it
      // (it reads product.shop directly), but the cart drawer does — it's
      // mounted by the storefront layout and reads the shop's fulfillment
      // flags through usePublicShop. Seeding is what keeps that from
      // becoming the second request this page exists to avoid.
      queryClient.setQueryData(["public-shop"], product.shop);
      return product;
    },
  });
}
