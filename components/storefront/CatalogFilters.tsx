"use client";

import { Search } from "lucide-react";
import { storefrontType } from "@/lib/design-tokens";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CatalogFiltersProps {
  // Raw input value — the parent debounces it before querying.
  search: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  // null = "All".
  activeCategoryId: number | null;
  onCategoryChange: (id: number | null) => void;
}

/**
 * Sticks just under the fixed nav (top-16). Categories scroll horizontally
 * on a narrow screen and the search field shrinks beside them, so this stays
 * a single 48px-tall row at every width — a second stacked row here would
 * cost a phone ~100px of fixed chrome on top of the nav.
 */
export function CatalogFilters({
  search,
  onSearchChange,
  categories,
  activeCategoryId,
  onCategoryChange,
}: CatalogFiltersProps) {
  return (
    <div className="sticky top-16 z-40 border-b border-black/5 bg-storefront-bg/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-8">
        {/* min-w-0 lets this flex child actually shrink so the strip scrolls
            instead of pushing the search field off-screen. */}
        <div className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryButton
            active={activeCategoryId === null}
            onClick={() => onCategoryChange(null)}
          >
            All
          </CategoryButton>
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              active={activeCategoryId === category.id}
              onClick={() => onCategoryChange(category.id)}
            >
              {category.name}
            </CategoryButton>
          ))}
        </div>

        <label className="relative shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            aria-label="Search products"
            className="h-9 w-32 rounded-full border border-black/10 bg-white/60 pl-8 pr-3 text-sm text-storefront-ink outline-none transition-[width,border-color] placeholder:text-muted-foreground focus:w-44 focus:border-storefront-ink/30 sm:w-44 sm:focus:w-56"
          />
        </label>
      </div>
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        storefrontType.navLabel,
        "shrink-0 rounded-full px-3.5 py-2 whitespace-nowrap transition-colors",
        active
          ? "bg-storefront-ink text-storefront-bg"
          : "text-muted-foreground hover:text-storefront-ink",
      )}
    >
      {children}
    </button>
  );
}
