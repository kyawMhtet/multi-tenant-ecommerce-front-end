import { Mail, Phone } from "lucide-react";
import { formatBillingDate } from "@/lib/billing";
import type { PlatformShop } from "@/lib/types";
import { surface, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={typography.microLabel}>{label}</span>
      <span className="text-sm font-medium break-words">{children}</span>
    </div>
  );
}

/**
 * Who to contact about this shop.
 *
 * This is why the detail screen exists at all: someone has emailed support and
 * the question is which shop they are and how to answer them. So the email and
 * phone are live links rather than text to copy out — the same treatment they
 * get on PendingInvoiceCard, for the same reason.
 *
 * The timezone is here because it decides whether calling right now is
 * reasonable, which is not obvious from a Kyat-selling shop that turns out to
 * be operated from Bangkok.
 */
export function ShopOwnerPanel({ shop }: { shop: PlatformShop }) {
  return (
    <div className={cn(surface.panel, "flex flex-col gap-5 p-5")}>
      <h2 className={typography.sectionHeading}>Owner</h2>

      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Name">{shop.owner_name ?? "—"}</Fact>

        <Fact label="Email">
          {shop.owner_email ? (
            <a
              href={`mailto:${shop.owner_email}`}
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <Mail className="size-3.5 shrink-0 text-muted-foreground" />
              {shop.owner_email}
            </a>
          ) : (
            "—"
          )}
        </Fact>

        <Fact label="Phone">
          {shop.owner_phone ? (
            <a
              href={`tel:${shop.owner_phone}`}
              className="inline-flex items-center gap-1.5 hover:underline"
            >
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              {shop.owner_phone}
            </a>
          ) : (
            "—"
          )}
        </Fact>

        <Fact label="Timezone">{shop.timezone ?? "—"}</Fact>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-5 sm:grid-cols-4">
        <Fact label="Shop ID">{shop.id}</Fact>
        <Fact label="Slug">{shop.slug}</Fact>
        {/* Both currencies, side by side and labelled by what they mean rather
            than both saying "currency". A Kyat-selling shop can be billed in
            Baht, and a directory that blurred the two would be actively
            misleading — see BillingCurrency::for(). */}
        <Fact label="Sells in">{shop.selling_currency ?? "—"}</Fact>
        <Fact label="Signed up">{formatBillingDate(shop.created_at) ?? "—"}</Fact>
      </div>
    </div>
  );
}
