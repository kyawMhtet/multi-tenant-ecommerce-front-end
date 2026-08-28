import {
  Camera,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  PhoneCall,
  Send,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ShopLogo } from "@/components/storefront/ShopLogo";
import { storefrontType } from "@/lib/design-tokens";
import {
  buildSocialLinks,
  groupBusinessHours,
  telHref,
  type SocialLinkKey,
} from "@/lib/shop-profile";
import type { PublicShop } from "@/lib/types";
import { cn } from "@/lib/utils";

// lucide dropped its brand glyphs, so every platform gets a generic icon
// plus its name in text — the label is what makes it recognisable, the icon
// is just the anchor. That's why these are labelled pills and not the
// icon-only circles most storefronts use: a bare "Users" glyph reads as
// nothing, certainly not Facebook.
const SOCIAL_ICONS: Record<SocialLinkKey, LucideIcon> = {
  facebook: Users,
  instagram: Camera,
  tiktok: Music2,
  telegram: Send,
  messenger: MessageCircle,
  viber: PhoneCall,
};

const columnHeading = cn(storefrontType.navLabel, "text-white/40");
const linkClass = "text-sm text-white/70 transition-colors hover:text-white";

/**
 * Closes every storefront page on the shared dark panel — bookending the
 * hero — with the shop's identity and the practical details a customer
 * wants: how to reach them, when they're open, where to find them online.
 * On the product page, reached by a bare link, this is the only place any
 * of it appears. Each block removes itself when that part of the profile is
 * unset.
 */
export function ShopFooter({ shop }: { shop: PublicShop }) {
  // Collapsed to runs of like days — a full seven-row week is a wall of
  // small text in a footer, and mostly repetition.
  const hourGroups = groupBusinessHours(shop.business_hours);
  const hasHours = hourGroups.some((group) => !group.closed);
  const socialLinks = buildSocialLinks(shop.social_links);
  const hasContact = Boolean(shop.business_phone || shop.business_email);
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden bg-storefront-panel text-white sm:mt-24">
      <div className="bg-grain absolute inset-0 opacity-10 mix-blend-overlay" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pt-14 sm:px-8 sm:pt-20">
        {/* Brand ------------------------------------------------------- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ShopLogo
              name={shop.name}
              logoUrl={shop.logo_url}
              className="bg-white/10 text-white ring-white/15"
            />
            <span className="font-display min-w-0 text-xl font-bold tracking-[-0.02em] text-balance sm:text-2xl">
              {shop.name}
            </span>
          </div>

          {shop.address && (
            <p className="flex max-w-md items-start gap-2 text-sm leading-relaxed text-white/60">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{shop.address}</span>
            </p>
          )}
        </div>

        {/* Detail columns ---------------------------------------------- */}
        {(hasContact || hasHours || socialLinks.length > 0) && (
          <div className="mt-12 flex flex-wrap gap-x-12 gap-y-10 border-t border-white/10 pt-10">
            {hasContact && (
              <div className="flex min-w-48 flex-1 flex-col gap-3.5">
                <h2 className={columnHeading}>Get in touch</h2>
                <ul className="flex flex-col gap-2.5">
                  {shop.business_phone && (
                    <li>
                      <a
                        href={telHref(shop.business_phone)}
                        className={cn(linkClass, "inline-flex items-center gap-2.5")}
                      >
                        <Phone className="size-4 shrink-0 text-white/30" aria-hidden="true" />
                        {shop.business_phone}
                      </a>
                    </li>
                  )}
                  {shop.business_email && (
                    <li>
                      <a
                        href={`mailto:${shop.business_email}`}
                        className={cn(linkClass, "inline-flex items-start gap-2.5")}
                      >
                        <Mail
                          className="mt-0.5 size-4 shrink-0 text-white/30"
                          aria-hidden="true"
                        />
                        <span className="break-all">{shop.business_email}</span>
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {hasHours && (
              <div className="flex min-w-60 flex-1 flex-col gap-3.5">
                <h2 className={cn(columnHeading, "flex items-center gap-2")}>
                  <Clock className="size-3.5" aria-hidden="true" />
                  Opening hours
                </h2>
                <dl className="flex flex-col gap-2">
                  {hourGroups.map((group) => (
                    <div
                      key={group.label}
                      className="flex items-baseline justify-between gap-4 text-sm"
                    >
                      <dt className="shrink-0 text-white/40">{group.label}</dt>
                      <dd
                        className={cn(
                          "text-right tabular-nums",
                          group.closed ? "text-white/30" : "text-white/80",
                        )}
                      >
                        {group.hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className="flex min-w-48 flex-1 flex-col gap-3.5">
                <h2 className={columnHeading}>Follow</h2>
                <ul className="flex flex-wrap gap-2">
                  {socialLinks.map(({ key, label, href, isExternal }) => {
                    const Icon = SOCIAL_ICONS[key];
                    return (
                      <li key={key}>
                        <a
                          href={href}
                          {...(isExternal
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-sm text-white/70 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-white"
                        >
                          <Icon className="size-4 shrink-0" aria-hidden="true" />
                          {label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Legal ------------------------------------------------------- */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6">
          <p className="text-xs text-white/40">
            © {year} {shop.name}
          </p>
          <p className="text-xs text-white/40">
            Orders are confirmed directly by the shop.
          </p>
        </div>
      </div>

      {/* Oversized wordmark — a brand sign-off that fills the panel the way
          small grey text never does. Clipped by the footer's overflow-hidden
          and purely decorative, so it's hidden from assistive tech. */}
      <p
        aria-hidden="true"
        className="font-display pointer-events-none -mb-[0.22em] select-none truncate px-4 text-center text-[clamp(3.5rem,17vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.04em] text-white/5 sm:px-8"
      >
        {shop.name}
      </p>
    </footer>
  );
}
