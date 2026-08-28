import { ArrowDown, MapPin } from "lucide-react";
import { storefrontType } from "@/lib/design-tokens";
import type { PublicShop } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The storefront's masthead — full-bleed, the shop's cover image behind a
 * heavy bottom scrim so the wordmark and address sit legibly over it. With
 * no cover uploaded it falls back to the shared dark panel with an
 * indigo-tinted wash, so an unfilled profile still reads as designed.
 *
 * Content is bottom-left (editorial), and a scroll cue drops the visitor
 * into the catalogue below.
 */
export function StorefrontHero({ shop }: { shop: PublicShop }) {
  const hasCover = Boolean(shop.cover_url);

  return (
    <section className="relative flex h-[86svh] max-h-225 min-h-112 w-full flex-col justify-end overflow-hidden bg-storefront-panel text-white sm:min-h-140">
      {hasCover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- cover_url is already a full URL from the backend */}
          <img
            src={shop.cover_url!}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/20" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(115% 85% at 12% 0%, color-mix(in oklch, var(--primary) 45%, transparent), transparent 62%)",
          }}
        />
      )}
      <div className="bg-grain absolute inset-0 opacity-10 mix-blend-overlay" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-24 sm:px-8 sm:pb-20">
        <p
          className={cn(
            storefrontType.navLabel,
            "animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-white/70 duration-700",
          )}
        >
          The shop
        </p>

        <h1
          className={cn(
            storefrontType.hero,
            "animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-3 max-w-[16ch] text-balance delay-100 duration-700",
          )}
        >
          {shop.name}
        </h1>

        <div className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 delay-200 duration-700">
          {shop.address && (
            <p className="flex items-start gap-1.5 text-sm text-white/70">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="max-w-xs">{shop.address}</span>
            </p>
          )}

          <a
            href="#catalog"
            className={cn(
              storefrontType.navLabel,
              "group inline-flex items-center gap-2 text-white/90 transition-colors hover:text-white",
            )}
          >
            Browse the collection
            <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
