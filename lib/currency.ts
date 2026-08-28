export function formatCurrency(amount: number | string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
}

// A price as a plain grouped number with two decimals and no currency
// symbol — the convention every product / POS / receipt / storefront
// surface already uses (each with its own local Intl.NumberFormat).
// Centralised here so new code matches without re-declaring it; the
// surrounding UI names the currency once rather than on every line.
export function formatPrice(amount: number | string): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

// Customer-facing money: always name the currency when we know it. A
// storefront price with no unit ("32.00") is genuinely ambiguous to a
// shopper, unlike an admin table that labels its currency once in a header.
//
// Falls back to the bare number when the currency is missing (a cart line
// saved before this field existed) or when Intl rejects the code — it
// throws a RangeError on anything that isn't a valid ISO 4217 code, and a
// bad value in the shop profile must not blank out the whole price.
export function formatMoney(amount: number | string, currency: string | null | undefined): string {
  if (!currency) return formatPrice(amount);
  try {
    return formatCurrency(amount, currency);
  } catch {
    return formatPrice(amount);
  }
}

// order_items.quantity is decimal:2-cast, so it arrives as "2.00" — which
// reads as raw database output on a receipt or an order line. This renders
// it as "2", while a genuine fractional line (1.5 kg) still shows as "1.5",
// so it isn't the same thing as assuming quantities are integers.
export function formatQuantity(quantity: number | string): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(Number(quantity));
}
