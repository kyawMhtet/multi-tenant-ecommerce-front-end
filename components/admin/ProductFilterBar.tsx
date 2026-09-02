"use client";

import { AlertTriangle } from "lucide-react";
import { useCategories } from "@/lib/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type ActiveStatus = "all" | "active" | "inactive";

// Base UI's <Select.Value> renders the raw value unless the root is handed
// an `items` label map — it doesn't read the matching <Select.Item>'s
// children the way Radix does. Without this the trigger reads "all" instead
// of "All statuses". The category select alongside it already had the same
// fix; this one never did.
const ACTIVE_STATUS_ITEMS: Record<ActiveStatus, string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

interface ProductFilterBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  categoryId: number | null;
  onCategoryIdChange: (value: number | null) => void;
  activeStatus: ActiveStatus;
  onActiveStatusChange: (value: ActiveStatus) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (value: boolean) => void;
  isFetching?: boolean;
  // Owned by the page (it also drives the filtered-to-nothing empty state),
  // passed down so the bar can offer the reset next to the controls that
  // caused it.
  onClear: () => void;
  isFiltered: boolean;
}

export function ProductFilterBar({
  searchInput,
  onSearchInputChange,
  categoryId,
  onCategoryIdChange,
  activeStatus,
  onActiveStatusChange,
  lowStockOnly,
  onLowStockOnlyChange,
  isFetching,
  onClear,
  isFiltered,
}: ProductFilterBarProps) {
  const { data: categories } = useCategories();

  // Base UI's <Select.Value> normally resolves its label by reading the
  // matching, already-mounted <Select.Item>'s children — but categories
  // load asynchronously, so if categoryId is set before that item has ever
  // mounted (e.g. this filter bar rendering before useCategories resolves),
  // there's nothing to read and it falls back to showing the raw id. The
  // items prop is Base UI's documented fix: an explicit id → label map the
  // trigger can resolve from directly, no mounted item required.
  const categoryItems: Record<string, string> = { all: "All categories" };
  categories?.forEach((category) => {
    categoryItems[String(category.id)] = category.name;
  });

  return (
    <FilterBar
      onClear={onClear}
      isFiltered={isFiltered}
      search={
        <SearchInput
          value={searchInput}
          onChange={onSearchInputChange}
          label="Search products"
          placeholder="Search by name, SKU, or barcode…"
          isFetching={isFetching}
        />
      }
    >
      <Select
        items={categoryItems}
        value={categoryId !== null ? String(categoryId) : "all"}
        onValueChange={(value) => onCategoryIdChange(!value || value === "all" ? null : Number(value))}
      >
        <SelectTrigger className={cn(controls.select, "w-44 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories?.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={ACTIVE_STATUS_ITEMS}
        value={activeStatus}
        onValueChange={(value) => onActiveStatusChange((value ?? "all") as ActiveStatus)}
      >
        <SelectTrigger className={cn(controls.select, "w-36 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {/* A toggle button rather than the checkbox this used to be: a bare
          checkbox floating between two 40px selects has no shape of its own
          and left the toolbar looking ragged. aria-pressed carries the same
          on/off state to assistive tech that the checkbox did. */}
      <Button
        type="button"
        variant="outline"
        aria-pressed={lowStockOnly}
        onClick={() => onLowStockOnlyChange(!lowStockOnly)}
        className={cn(
          controls.button,
          "font-normal",
          lowStockOnly && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15",
        )}
      >
        <AlertTriangle className="size-4" />
        Low stock only
      </Button>
    </FilterBar>
  );
}
