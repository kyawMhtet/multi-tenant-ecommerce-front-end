// Classic 1 … n-1 n n+1 … last shape — collapses to a plain run for small
// page counts, only introduces ellipses once there's actually a gap to hide.
// Shared by every paginated admin list (products, orders) so the page-
// number layout stays identical across screens.
export function getPageNumbers(current: number, last: number): Array<number | "ellipsis"> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const keep = new Set([1, last, current - 1, current, current + 1]);
  const pages = [...keep].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (const page of pages) {
    if (previous && page - previous > 1) result.push("ellipsis");
    result.push(page);
    previous = page;
  }
  return result;
}
