"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CART_STORAGE_KEY,
  cartCount,
  cartSubtotal,
  readStoredCart,
  writeStoredCart,
  type CartLine,
} from "@/lib/cart";

// --- Store over localStorage -------------------------------------------------
// A module-level external store, read through useSyncExternalStore so the
// server snapshot ([]) and the first client render agree — no mount effect,
// no hydration mismatch on the count badge. It also picks up `storage`
// events, so adding to the cart in one tab shows up in the others.

const EMPTY: CartLine[] = [];
let snapshot: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (!loaded) {
    snapshot = readStoredCart();
    loaded = true;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CART_STORAGE_KEY) {
      snapshot = readStoredCart();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): CartLine[] {
  ensureLoaded();
  return snapshot;
}

function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

function mutate(updater: (prev: CartLine[]) => CartLine[]): void {
  ensureLoaded();
  const next = updater(snapshot);
  if (next === snapshot) return;
  snapshot = next;
  writeStoredCart(next);
  emit();
}

// --- Context ---------------------------------------------------------------

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
  // Merges into an existing line (by variantSlug), adding to its quantity;
  // otherwise appends. The latest product/price/stock snapshot wins.
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantSlug: string, quantity: number) => void;
  removeLine: (variantSlug: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addLine = useCallback<CartContextValue["addLine"]>((line, quantity = 1) => {
    mutate((prev) => {
      const existing = prev.find((l) => l.variantSlug === line.variantSlug);
      if (existing) {
        return prev.map((l) =>
          l.variantSlug === line.variantSlug
            ? { ...l, ...line, quantity: l.quantity + quantity }
            : l,
        );
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const setQuantity = useCallback<CartContextValue["setQuantity"]>((variantSlug, quantity) => {
    mutate((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.variantSlug !== variantSlug)
        : prev.map((l) => (l.variantSlug === variantSlug ? { ...l, quantity } : l)),
    );
  }, []);

  const removeLine = useCallback<CartContextValue["removeLine"]>((variantSlug) => {
    mutate((prev) => prev.filter((l) => l.variantSlug !== variantSlug));
  }, []);

  const clear = useCallback(() => mutate(() => EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotal: cartSubtotal(lines),
      isOpen,
      openCart,
      closeCart,
      setOpen: setIsOpen,
      addLine,
      setQuantity,
      removeLine,
      clear,
    }),
    [lines, isOpen, openCart, closeCart, addLine, setQuantity, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
