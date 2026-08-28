import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Product, ProductVariant } from "@/lib/types";

export interface CartLine {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function variantLabel(product: Product, variant: ProductVariant): string {
  return variant.variant_name ? `${product.name} — ${variant.variant_name}` : product.name;
}

interface POSCartProps {
  cart: CartLine[];
  subtotal: number;
  onUpdateQuantity: (variantId: number, quantity: number) => void;
  onRemoveLine: (variantId: number) => void;
  onCheckout: () => void;
  isPending: boolean;
  error: string | null;
}

export function POSCart({
  cart,
  subtotal,
  onUpdateQuantity,
  onRemoveLine,
  onCheckout,
  isPending,
  error,
}: POSCartProps) {
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Card className="h-fit w-full shadow-sm md:sticky md:top-6 md:w-96">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cart</span>
          {itemCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {itemCount} item{itemCount > 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {cart.length === 0 && (
          <EmptyState
            variant="inline"
            icon={ShoppingCart}
            title="Cart is empty"
            description="Tap a product on the left to add it to this sale."
          />
        )}

        {cart.length > 0 && (
          <div className="flex max-h-[calc(100vh-24rem)] flex-col divide-y overflow-y-auto">
            {cart.map((line) => (
              <div key={line.variant.id} className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {variantLabel(line.product, line.variant)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {priceFormatter.format(Number(line.variant.selling_price))} each
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveLine(line.variant.id)}
                  >
                    <X />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={line.quantity <= 1}
                      onClick={() => onUpdateQuantity(line.variant.id, line.quantity - 1)}
                    >
                      <Minus />
                      <span className="sr-only">Decrease quantity</span>
                    </Button>
                    <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onUpdateQuantity(line.variant.id, line.quantity + 1)}
                    >
                      <Plus />
                      <span className="sr-only">Increase quantity</span>
                    </Button>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {priceFormatter.format(Number(line.variant.selling_price) * line.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between border-t pt-3 text-base font-semibold">
          <span>Subtotal</span>
          <span className="tabular-nums">{priceFormatter.format(subtotal)}</span>
        </div>

        {error && <ErrorState message={error} />}

        <Button
          type="button"
          size="lg"
          onClick={onCheckout}
          disabled={cart.length === 0 || isPending}
        >
          {isPending ? "Processing..." : "Checkout — cash"}
        </Button>
      </CardContent>
    </Card>
  );
}
