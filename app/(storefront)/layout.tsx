import { Bricolage_Grotesque } from "next/font/google";
import { CartProvider } from "@/components/storefront/CartProvider";
import { CartDrawer } from "@/components/storefront/CartDrawer";

// The storefront's display face — a contemporary grotesque with a bit of
// flare at large sizes. Loaded here (not the root layout) so it's tied to
// the customer-facing route group; the admin app keeps Geist only. Exposed
// as --font-display-src, which globals.css maps to the `font-display`
// utility (falling back to the body face everywhere else).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-src",
});

// Customer-facing route group, served from a tenant's own subdomain. It owns
// the storefront's surface (its own warm ground + display font) and the
// page frame — a column that lets each page pin its footer to the bottom on
// a short page. The nav/hero/footer stay with the pages, because the two
// storefront routes get their shop from different places: the home page
// queries it, the product page reads it off the product payload.
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} flex flex-1 flex-col bg-storefront-bg text-foreground`}
    >
      <CartProvider>
        {children}
        {/* Mounted once here so the cart drawer and its contents survive
            navigation between storefront pages. */}
        <CartDrawer />
      </CartProvider>
    </div>
  );
}
