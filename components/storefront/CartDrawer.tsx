"use client";

import { useState } from "react";
import { CalendarClock, ShoppingBag } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useCreateOnlineOrder } from "@/lib/hooks/useCreateOnlineOrder";
import { usePublicPaymentMethods } from "@/lib/hooks/usePublicPaymentMethods";
import { usePublicShop } from "@/lib/hooks/usePublicShop";
import { formatMoney } from "@/lib/currency";
import { cartRequiresPrepayment, deliveryFeeFor } from "@/lib/cart";
import { preorderWaitText } from "@/lib/preorder";
import type { FulfillmentType } from "@/lib/types";
import { storefrontType } from "@/lib/design-tokens";
import { useCart } from "@/components/storefront/CartProvider";
import { CartLineItem } from "@/components/storefront/CartLineItem";
import { PaymentMethodPicker } from "@/components/storefront/PaymentMethodPicker";
import {
  EMPTY_ADDRESS,
  FulfillmentFields,
  type AddressDraft,
} from "@/components/storefront/FulfillmentFields";
import {
  readStoredCheckoutDetails,
  writeStoredCheckoutDetails,
} from "@/lib/checkout-details";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// The backend's own `method` key for cash on delivery — the one option a
// prepaid preorder can't use, and the only method this file singles out.
const COD_METHOD = "cod";

const primaryButton = cn(
  storefrontType.navLabel,
  "h-13 w-full rounded-xl bg-storefront-ink text-storefront-bg transition-opacity hover:opacity-90 disabled:opacity-40",
);

const linkAction = cn(
  storefrontType.navLabel,
  "border-b-2 border-storefront-ink pb-1 text-storefront-ink transition-opacity hover:opacity-60",
);

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, setOpen, closeCart, setQuantity, removeLine, clear } =
    useCart();
  const createOrder = useCreateOnlineOrder();
  const {
    data: paymentMethods,
    isPending: paymentMethodsPending,
    error: paymentMethodsError,
  } = usePublicPaymentMethods();
  // Only while the drawer is open: on the product page this payload arrives
  // embedded in the product response (usePublicProduct seeds this exact
  // cache entry), so gating it is what keeps the drawer from firing a
  // duplicate request on every storefront page load. Opening the cart does
  // refetch it — which is the point, since these flags decide what the
  // customer may pick, and the shop can change them at any time.
  const {
    data: shop,
    error: shopError,
    refetch: refetchShop,
  } = usePublicShop({ enabled: isOpen });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    payment?: string;
    fulfillment?: string;
    fullAddress?: string;
    address?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  // Never seeded from storage — see lib/checkout-details.ts. The customer
  // picks every time.
  const [fulfillment, setFulfillment] = useState<FulfillmentType | null>(null);
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  // Set between "the order succeeded" and "the browser has actually left for
  // the hosted checkout" — the button must not flip back to an idle state in
  // that window, or it reads as though nothing happened.
  const [isRedirecting, setIsRedirecting] = useState(false);
  // The server refused cash on delivery for this cart. Backstop for a line
  // whose prepayment snapshot is stale (added before the shop turned the
  // rule on, or before the field existed at all): without it the customer is
  // handed back the same rejected option and invited to try it again.
  const [codRejected, setCodRejected] = useState(false);

  // Filtering cod out is the client's job and nobody else's: GET
  // /public/payment-methods can't do it, because it doesn't know the cart.
  // Advisory either way — the server rejects a prepaid preorder paid on
  // delivery with a 422 regardless of what this list shows.
  const offeredMethods = paymentMethods ?? [];
  const hidesCod = cartRequiresPrepayment(lines) || codRejected;
  const methods = hidesCod
    ? offeredMethods.filter((m) => m.method !== COD_METHOD)
    : offeredMethods;
  // True only when the shop actually offers cod and this cart can't use it,
  // so the explanation below never appears against an absence nobody noticed.
  const codHidden = methods.length < offeredMethods.length;

  // A cart may mix in-stock and preorder lines. The order ships as one
  // parcel, so the schedule the customer is agreeing to is the slowest line's
  // — and any line with no committed date drags the whole thing to "when
  // stock arrives" rather than borrowing another line's number.
  const preorderLines = lines.filter((line) => line.stockStatus === "preorder");
  const hasPreorder = preorderLines.length > 0;
  const slowestLeadTime = preorderLines.some((line) => line.preorderLeadTimeDays === null)
    ? null
    : preorderLines.reduce((slowest, line) => Math.max(slowest, line.preorderLeadTimeDays ?? 0), 0);
  const mixesStockAndPreorder = hasPreorder && preorderLines.length < lines.length;
  const activeMethod = methods.find((m) => m.method === paymentMethod) ?? null;

  // What this shop actually offers. Empty while the shop is still loading,
  // which reads the same as "nothing offered" for the button's purposes —
  // there is no safe fulfillment_type to send in either case.
  const fulfillmentOptions: FulfillmentType[] = [];
  if (shop?.allows_delivery) fulfillmentOptions.push("delivery");
  if (shop?.allows_pickup) fulfillmentOptions.push("pickup");
  // A shop offering one option gives the customer nothing to choose, so
  // that value is used without being picked — `fulfillment` (what they
  // chose) stays untouched underneath, and this is what gets sent and what
  // decides whether the address block shows.
  const onlyOption = fulfillmentOptions.length === 1 ? fulfillmentOptions[0] : null;
  const effectiveFulfillment = onlyOption ?? fulfillment;

  // Every line in a cart comes from this one shop (see CartLine.currency), so
  // the first line names the currency for the whole summary.
  const currency = lines[0]?.currency ?? null;
  // The fee is the shop's, but whether it applies is the customer's choice —
  // pickup is always free, and an undecided choice bills as delivery so the
  // total can only fall once they pick, never rise after they've read it.
  const deliveryFee = deliveryFeeFor(effectiveFulfillment, shop?.delivery_fee);
  // A pickup-only shop has no delivery line to show, and neither does one
  // whose profile hasn't loaded yet — a Total that appears at the subtotal
  // and then climbs is the exact thing this block exists to avoid.
  const showsDelivery = Boolean(shop?.allows_delivery);

  // Preselect the shop's first method once the list arrives, and drop a
  // selection that no longer exists (the shop turned it off mid-session).
  // Render-phase adjustment rather than an effect: the picker below is never
  // committed holding a method the shop doesn't offer.
  const methodKey = methods.map((m) => m.method).join(",");
  const [lastMethodKey, setLastMethodKey] = useState(methodKey);
  const selectionIsStale =
    paymentMethod !== null && !methods.some((m) => m.method === paymentMethod);
  if (methodKey !== lastMethodKey || selectionIsStale) {
    setLastMethodKey(methodKey);
    setPaymentMethod(methods[0]?.method ?? null);
    setPaymentProof(null);
  }

  // Prefill the returning customer's details the first time the drawer opens
  // with the form still untouched. A render-phase adjustment rather than an
  // effect, because `isOpen` is driven by the cart context (add-to-cart calls
  // openCart() directly), so the Sheet's own onOpenChange never fires for it.
  // Safe to read localStorage here: isOpen is false on the server and only
  // flips from a client interaction.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen && !name && !phone && address.fullAddress === "") {
      const saved = readStoredCheckoutDetails();
      setName(saved.name);
      setPhone(saved.phone);
      setAddress({
        fullAddress: saved.fullAddress,
        houseNumber: saved.houseNumber,
        street: saved.street,
        township: saved.township,
        city: saved.city,
        // Not remembered: a note is about one delivery ("leave with the
        // guard today"), not a standing instruction.
        note: "",
      });
    }
  }

  function handleOpenChange(open: boolean) {
    setOpen(open);
    if (!open) {
      // Drop transient checkout state so reopening starts clean.
      setFieldErrors({});
      setFormError(null);
      setPlacedOrderNumber(null);
      setPaymentProof(null);
      setIsRedirecting(false);
      setFulfillment(null);
      setCodRejected(false);
      createOrder.reset();
    }
  }

  async function handleCheckout() {
    if (lines.length === 0) return;

    createOrder.reset();
    setFormError(null);

    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!phone.trim()) errors.phone = "Phone number is required.";
    if (!paymentMethod) errors.payment = "Choose how you'd like to pay.";
    if (!effectiveFulfillment) errors.fulfillment = "Choose delivery or pickup.";
    if (effectiveFulfillment === "delivery" && !address.fullAddress.trim()) {
      errors.fullAddress = "Enter where we should deliver.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Narrowed by the guards above; re-read into locals because TS can't
    // follow the nullness checks through the errors object.
    const method = paymentMethod;
    const fulfillmentType = effectiveFulfillment;
    if (!method || !fulfillmentType) return;

    try {
      const { order, payment } = await createOrder.mutateAsync({
        items: lines.map((line) => ({
          product_variant_slug: line.variantSlug,
          quantity: line.quantity,
        })),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        payment_method: method,
        fulfillment_type: fulfillmentType,
        // Only ever sent for delivery; lib/api/orders.ts drops the blank
        // optional keys before it goes on the wire.
        ...(fulfillmentType === "delivery"
          ? {
              delivery_address: {
                full_address: address.fullAddress.trim(),
                house_number: address.houseNumber.trim(),
                street: address.street.trim(),
                township: address.township.trim(),
                city: address.city.trim(),
                note: address.note.trim(),
              },
            }
          : {}),
        ...(paymentProof ? { payment_proof: paymentProof } : {}),
      });

      // Remembered for next time on this device. Written only after the
      // order actually succeeded, so a rejected checkout doesn't persist
      // details the backend wouldn't take.
      writeStoredCheckoutDetails({
        name: name.trim(),
        phone: phone.trim(),
        fullAddress: address.fullAddress.trim(),
        houseNumber: address.houseNumber.trim(),
        street: address.street.trim(),
        township: address.township.trim(),
        city: address.city.trim(),
      });

      // The order exists either way at this point, so the cart is emptied
      // before branching — leaving it filled would invite a duplicate order
      // if the redirect is slow or the customer comes back.
      clear();
      setName("");
      setPhone("");
      setPaymentProof(null);
      setFulfillment(null);
      setAddress(EMPTY_ADDRESS);

      // The server says what happens next; don't re-derive it from the
      // method that was sent.
      if (payment.type === "redirect" && payment.url) {
        setIsRedirecting(true);
        window.location.href = payment.url;
        return;
      }

      setPlacedOrderNumber(order.order_number);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      const validation = err.errors ?? {};
      // A prepaid preorder paid on delivery lands here — the rule the client
      // mirrors above, enforced for real. Recorded rather than just reported,
      // so the picker below re-renders without the option that was just
      // rejected instead of offering it again for a second identical failure.
      if (err.status === 422 && validation.payment_method && paymentMethod === COD_METHOD) {
        setCodRejected(true);
      }
      if (validation.fulfillment_type) {
        // The shop changed what it offers between this drawer opening and
        // this submit. Refetching is what unsticks the customer: the toggle
        // re-renders against the current options (and collapses to a plain
        // statement if only one is left) instead of standing there offering
        // the choice that was just rejected.
        void refetchShop();
      }
      // Laravel keys nested rules with dot notation, so the address's own
      // rule and its full_address rule arrive under different keys.
      const fieldRules = [
        validation.customer_name,
        validation.customer_phone,
        validation.payment_method,
        validation.fulfillment_type,
        validation.delivery_address,
        validation["delivery_address.full_address"],
      ];
      if (err.status === 422 && fieldRules.some(Boolean)) {
        setFieldErrors({
          name: validation.customer_name?.[0],
          phone: validation.customer_phone?.[0],
          payment: validation.payment_method?.[0],
          fulfillment: validation.fulfillment_type?.[0],
          fullAddress: validation["delivery_address.full_address"]?.[0],
          address: validation.delivery_address?.[0],
        });
        return;
      }

      // A rejected screenshot (too large, not an image) must not read as a
      // failed order — it's the one attachment on the form, and the fix is
      // to drop it and order anyway.
      if (err.status === 422 && validation.payment_proof) {
        setFormError(
          `${validation.payment_proof[0]} Remove the screenshot and place the order — you can send it to the shop afterwards.`,
        );
        return;
      }

      if (err.status === 422 || err.status === 409) {
        // A stock failure. The server names one variant + an exact remaining
        // count in a human sentence (the same InsufficientStock exception
        // the POS surfaces) — never shown to a customer, and not something
        // we can safely attribute to a specific line. So it's a
        // cart-level notice; the cart and the entered details stay put and
        // the per-line quantity / remove controls are right there to act on.
        setFormError(
          "Something in your cart just changed — an item sold out or there's less left than shown. Adjust a quantity or remove an item, then try again.",
        );
        return;
      }

      setFormError(err.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full! gap-0 p-0 sm:max-w-md!">
        <SheetHeader className="border-b border-black/10">
          <SheetTitle className={cn(storefrontType.navLabel, "text-storefront-ink")}>
            {placedOrderNumber ? "Order placed" : `Cart${count > 0 ? ` (${count})` : ""}`}
          </SheetTitle>
        </SheetHeader>

        {placedOrderNumber ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className={cn(storefrontType.sectionHeading, "text-storefront-ink")}>Thank you</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Order {placedOrderNumber} — payment pending. We&apos;ll confirm once payment is
              received.
            </p>
            <button type="button" onClick={closeCart} className={cn(linkAction, "mt-2")}>
              Keep shopping
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="size-8 text-muted-foreground/40" aria-hidden="true" />
            <p className={cn(storefrontType.sectionHeading, "text-storefront-ink")}>
              Your cart is empty
            </p>
            <button type="button" onClick={closeCart} className={cn(linkAction, "mt-1")}>
              Keep shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-black/5 overflow-y-auto px-4">
              {lines.map((line) => (
                <CartLineItem
                  key={line.variantSlug}
                  line={line}
                  onQuantityChange={(quantity) => setQuantity(line.variantSlug, quantity)}
                  onRemove={() => removeLine(line.variantSlug)}
                  onNavigate={closeCart}
                />
              ))}
            </div>

            <div className="flex max-h-[60%] shrink-0 flex-col gap-3 overflow-y-auto border-t border-black/10 p-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span
                    className={cn(
                      "tabular-nums text-storefront-ink",
                      // Without a delivery line below it, the subtotal is the
                      // total — and carries the weight the total would have.
                      !showsDelivery && "text-base font-semibold",
                    )}
                  >
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>

                {showsDelivery && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="tabular-nums text-storefront-ink">
                        {effectiveFulfillment === "pickup"
                          ? "Free — pickup"
                          : deliveryFee > 0
                            ? formatMoney(deliveryFee, currency)
                            : "Free"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-black/10 pt-2 text-sm">
                      <span className="font-medium text-storefront-ink">Total</span>
                      <span className="text-base font-semibold tabular-nums text-storefront-ink">
                        {formatMoney(subtotal + deliveryFee, currency)}
                      </span>
                    </div>

                    {/* Only while the choice is genuinely still open, and only
                        when there's a fee to lose by picking pickup. */}
                    {effectiveFulfillment === null && deliveryFee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Includes delivery — choose pickup below and it comes off.
                      </p>
                    )}
                  </>
                )}
              </div>

              {hasPreorder && (
                <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 px-3.5 py-3 text-sm text-sky-900">
                  <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{preorderWaitText(slowestLeadTime)}</span>
                    <br />
                    {mixesStockAndPreorder
                      ? "Your order includes a preorder item, so it all ships together once that arrives."
                      : "This is a preorder — it ships once your items are ready."}
                  </span>
                </div>
              )}

              {shopError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Couldn&apos;t load this shop&apos;s delivery options. Please try again in a
                  moment.
                </p>
              ) : !shop ? (
                // Same distinction the payment methods draw below: "still
                // loading" must not look like "this shop offers nothing".
                <div className="h-11 animate-pulse rounded-xl bg-muted" />
              ) : fulfillmentOptions.length === 0 ? (
                // The backend won't let a shop turn both off, so this is a
                // state that shouldn't exist — said plainly rather than
                // rendered as an empty gap the customer can't act on.
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  This shop isn&apos;t taking delivery or pickup orders right now. Contact them
                  directly to order.
                </p>
              ) : (
                <FulfillmentFields
                  options={fulfillmentOptions}
                  value={effectiveFulfillment}
                  onChange={(next) => {
                    setFulfillment(next);
                    setFieldErrors((prev) => ({
                      ...prev,
                      fulfillment: undefined,
                      // Switching to pickup retires any address complaint —
                      // there's no address to be wrong about any more.
                      ...(next === "pickup"
                        ? { fullAddress: undefined, address: undefined }
                        : {}),
                    }));
                  }}
                  address={address}
                  onAddressChange={(next) => {
                    setAddress(next);
                    setFieldErrors((prev) => ({
                      ...prev,
                      fullAddress: undefined,
                      address: undefined,
                    }));
                  }}
                  errors={fieldErrors}
                  disabled={createOrder.isPending || isRedirecting}
                />
              )}

              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
                {fieldErrors.name && (
                  <span className="text-xs text-destructive">{fieldErrors.name}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
                {fieldErrors.phone && (
                  <span className="text-xs text-destructive">{fieldErrors.phone}</span>
                )}
              </div>

              {paymentMethodsError ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Couldn&apos;t load payment options. Please try again in a moment.
                </p>
              ) : paymentMethodsPending ? (
                // Distinct from the empty case below: "still loading" and
                // "the shop offers nothing" look identical in the data but
                // must not read the same to a customer.
                <div className="h-11 animate-pulse rounded-xl bg-muted" />
              ) : methods.length === 0 ? (
                codHidden ? (
                  // The shop's only method was cash on delivery, and this cart
                  // can't use it. Naming the way out matters — the customer can
                  // drop the preorder line and pay on delivery for the rest.
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Preorder items must be paid in advance, and this shop only takes cash on
                    delivery. Remove the preorder item to order the rest, or contact the shop
                    directly.
                  </p>
                ) : (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    This shop isn&apos;t accepting online payments right now. Contact them
                    directly to order.
                  </p>
                )
              ) : (
                <>
                  {/* Above the list, not below it: it explains an absence, and
                      an explanation that arrives after the customer has already
                      hunted for the missing option is too late to help. */}
                  {codHidden && (
                    <p className="rounded-xl bg-sky-50 px-3.5 py-3 text-sm text-sky-900">
                      Preorder items must be paid in advance, so cash on delivery isn&apos;t
                      available for this order.
                    </p>
                  )}
                  <PaymentMethodPicker
                    methods={methods}
                    selected={paymentMethod}
                    onSelect={(next) => {
                      setPaymentMethod(next);
                      // A screenshot belongs to the method it was attached
                      // for — switching away drops it rather than sending a
                      // QR receipt along with a cash order.
                      setPaymentProof(null);
                      setFieldErrors((prev) => ({ ...prev, payment: undefined }));
                    }}
                    proof={paymentProof}
                    onProofChange={setPaymentProof}
                    disabled={createOrder.isPending || isRedirecting}
                  />
                  {fieldErrors.payment && (
                    <span className="text-xs text-destructive">{fieldErrors.payment}</span>
                  )}
                </>
              )}

              {formError && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {formError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={
                  createOrder.isPending ||
                  isRedirecting ||
                  methods.length === 0 ||
                  fulfillmentOptions.length === 0
                }
                className={primaryButton}
              >
                {isRedirecting
                  ? "Taking you to payment…"
                  : createOrder.isPending
                    ? "Placing order…"
                    : activeMethod?.requires_proof || activeMethod?.qr_url
                      ? "I've paid — place order"
                      : "Place order"}
              </button>
              {/* The reassurance has to match the method: a card order is
                  charged at the hosted checkout, not settled with the shop
                  afterwards. */}
              {activeMethod && (
                <p className="text-center text-xs text-muted-foreground">
                  {!activeMethod.requires_proof && !activeMethod.qr_url
                    ? "The shop confirms your order and arranges payment with you."
                    : "The shop checks your payment and confirms your order."}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
