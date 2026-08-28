// What a returning customer shouldn't have to retype. localStorage is
// origin-scoped and each storefront is its own subdomain, so this is already
// per-shop with no namespacing needed — the same reasoning as lib/cart.ts.
//
// This is a device-local convenience, not a read of the customer record: the
// storefront is unauthenticated, and a public "look up an address by phone
// number" endpoint would let anyone enumerate customers' addresses. Prefilling
// from what this browser typed last time gets the common case without that.
const CHECKOUT_STORAGE_KEY = "storefront_checkout_details";

export interface StoredCheckoutDetails {
  name: string;
  phone: string;
  fullAddress: string;
  houseNumber: string;
  street: string;
  township: string;
  city: string;
  // Deliberately absent: fulfillment type is never remembered. Restoring it
  // would be defaulting the choice silently, and being asked for an address
  // you don't need — or shipping to one you didn't mean — is worse than one
  // extra tap.
}

const EMPTY: StoredCheckoutDetails = {
  name: "",
  phone: "",
  fullAddress: "",
  houseNumber: "",
  street: "",
  township: "",
  city: "",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function readStoredCheckoutDetails(): StoredCheckoutDetails {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const stored = parsed as Record<string, unknown>;
    // Field-by-field rather than a spread: a partial or older payload fills
    // in as blanks instead of putting undefined into a controlled input.
    return {
      name: asString(stored.name),
      phone: asString(stored.phone),
      fullAddress: asString(stored.fullAddress),
      houseNumber: asString(stored.houseNumber),
      street: asString(stored.street),
      township: asString(stored.township),
      city: asString(stored.city),
    };
  } catch {
    return EMPTY;
  }
}

export function writeStoredCheckoutDetails(details: StoredCheckoutDetails): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(details));
  } catch {
    // Storage full or disabled — prefill is a convenience, never a failure.
  }
}
