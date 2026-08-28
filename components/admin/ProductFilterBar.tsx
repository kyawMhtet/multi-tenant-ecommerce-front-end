"use client";

import { Loader2Icon, Search } from "lucide-react";
import { useCategories } from "@/lib/hooks/useCategories";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ActiveStatus = "all" | "active" | "inactive";

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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, SKU, or barcode..."
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select
        items={categoryItems}
        value={categoryId !== null ? String(categoryId) : "all"}
        onValueChange={(value) => onCategoryIdChange(!value || value === "all" ? null : Number(value))}
      >
        <SelectTrigger size="sm" className="w-40">
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
        value={activeStatus}
        onValueChange={(value) => onActiveStatusChange((value ?? "all") as ActiveStatus)}
      >
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Label className="flex items-center gap-1.5 text-sm font-normal">
        <Checkbox
          checked={lowStockOnly}
          onCheckedChange={(checked) => onLowStockOnlyChange(checked === true)}
        />
        Low stock only
      </Label>

      {isFetching && (
        <Loader2Icon
          className="size-4 shrink-0 animate-spin text-muted-foreground"
          aria-label="Loading products from the server"
        />
      )}
    </div>
  );
}
