/**
 * Reading a variant's stock now that it can go negative.
 *
 * A variant with allow_preorder can be sold past zero, and the resulting
 * negative current_stock is correct data: -7 means seven units already sold
 * that the shop still owes customers. Nothing in the UI clamps it — but
 * "-7 in stock" is not how anyone thinks about it, so this is where the
 * number turns into the two facts staff actually act on: how many are on
 * the shelf, and how many are owed.
 */

/**
 * Units already sold that the shop doesn't have — 0 for any variant at or
 * above zero. Always positive, so callers render it without a minus sign.
 */
export function backorderedUnits(currentStock: number | string): number {
  const stock = Number(currentStock);
  if (!Number.isFinite(stock) || stock >= 0) return 0;
  return Math.abs(stock);
}

export function isBackordered(currentStock: number | string): boolean {
  return backorderedUnits(currentStock) > 0;
}

/**
 * The backlog across a set of variants, for a row that summarises several
 * (the products table). Untracked variants are skipped for the same reason
 * they're skipped in the on-hand total: their current_stock isn't a count
 * of anything.
 */
export function totalBackorderedUnits(
  variants: Array<{ track_stock: boolean; current_stock: string }>,
): number {
  return variants.reduce(
    (total, variant) =>
      variant.track_stock ? total + backorderedUnits(variant.current_stock) : total,
    0,
  );
}
