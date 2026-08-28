import Link from "next/link";
import { Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { formatMoney } from "@/lib/currency";
import { storefrontStockLabel } from "@/lib/design-tokens";
import type { CartLine } from "@/lib/cart";
import { cn } from "@/lib/utils";

interface CartLineItemProps {
  line: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  // Fired when the customer follows the line back to its product page —
  // the drawer closes so it isn't left open over that page.
  onNavigate: () => void;
}

export function CartLineItem({ line, onQuantityChange, onRemove, onNavigate }: CartLineItemProps) {
  const productHref = `/${line.variantSlug}`;

  return (
    <div className="flex gap-3 py-4">
      <Link
        href={productHref}
        onClick={onNavigate}
        prefetch={false}
        tabIndex={-1}
        aria-hidden="true"
        className="size-16 shrink-0 overflow-hidden rounded-md bg-muted"
      >
        {line.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- imageUrl is a full backend URL
          <img src={line.imageUrl} alt="" className="size-full object-cover" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={productHref}
            onClick={onNavigate}
            prefetch={false}
            className="group min-w-0"
          >
            <p className="truncate text-sm font-medium text-storefront-ink underline-offset-2 group-hover:underline">
              {line.productName}
            </p>
            {line.variantLabel && (
              <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
            )}
          </Link>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${line.productName}`}
            className="-m-1 p-1 text-muted-foreground transition-colors hover:text-storefront-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {line.stockStatus !== "in_stock" && (
          <p
            className={cn(
              "mt-0.5 text-xs font-medium",
              line.stockStatus === "out_of_stock" ? "text-red-700" : "text-amber-700",
            )}
          >
            {storefrontStockLabel[line.stockStatus]}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            onChange={onQuantityChange}
            aria-label={`Quantity for ${line.productName}`}
          />

          <span className="text-sm font-semibold tabular-nums text-storefront-ink">
            {formatMoney(Number(line.unitPrice) * line.quantity, line.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
