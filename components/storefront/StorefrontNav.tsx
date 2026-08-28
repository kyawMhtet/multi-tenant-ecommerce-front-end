"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { storefrontType } from "@/lib/design-tokens";
import { useCart } from "@/components/storefront/CartProvider";
import type { PublicShop } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StorefrontNavProps {
  shop: PublicShop;
  // When true the nav starts transparent, painted over the hero, and turns
  // solid on the first scroll. Pages with no hero (the product page) leave
  // it false so it's solid from the top.
  overHero?: boolean;
}

// Fixed so it floats over the hero rather than pushing it down. Pages
// without a hero pad their own content by the nav height (h-16).
export function StorefrontNav({ shop, overHero = false }: StorefrontNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const { count, openCart } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = overHero && !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 transition-colors duration-300",
        transparent
          ? "bg-transparent text-white"
          : "border-b border-black/5 bg-storefront-bg/85 text-storefront-ink backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        {/* min-w-0 + truncate: without them a long shop name pushes the cart
            button off the right edge on a phone. */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {shop.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- logo_url is already a full URL from the backend
            <img
              src={shop.logo_url}
              alt=""
              className={cn(
                "size-7 shrink-0 rounded-full object-cover ring-1",
                transparent ? "ring-white/30" : "ring-black/10",
              )}
            />
          )}
          <span className={cn(storefrontType.wordmark, "truncate")}>{shop.name}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <Link
            href={overHero ? "#catalog" : "/"}
            className={cn(storefrontType.navLabel, "hidden transition-opacity hover:opacity-60 sm:inline")}
          >
            Shop all
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
            className="relative -mr-1.5 grid size-9 place-items-center transition-opacity hover:opacity-60"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute right-0 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-none text-primary-foreground tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
