"use client";

import { FilterBar } from "@/components/shared/FilterBar";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type OrderStatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded";
export type OrderSourceFilter = "all" | "pos" | "online";

interface OrderFilterBarProps {
  status: OrderStatusFilter;
  onStatusChange: (value: OrderStatusFilter) => void;
  source: OrderSourceFilter;
  onSourceChange: (value: OrderSourceFilter) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  isFetching?: boolean;
  onClear: () => void;
  isFiltered: boolean;
}

const STATUS_OPTIONS: OrderStatusFilter[] = [
  "pending",
  "paid",
  "processing",
  "completed",
  "cancelled",
  "refunded",
];

// Base UI's <Select.Value> renders the raw value string unless the root is
// given an `items` label map — it doesn't read the matching <Select.Item>'s
// children the way Radix does. Without this, the trigger shows "all"
// instead of "All statuses" / "All sources". Same fix as the category
// select in ProductFilterBar.
const STATUS_ITEMS: Record<OrderStatusFilter, string> = {
  all: "All statuses",
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const SOURCE_ITEMS: Record<OrderSourceFilter, string> = {
  all: "All sources",
  pos: "POS",
  online: "Online",
};

export function OrderFilterBar({
  status,
  onStatusChange,
  source,
  onSourceChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  isFetching,
  onClear,
  isFiltered,
}: OrderFilterBarProps) {
  return (
    <FilterBar onClear={onClear} isFiltered={isFiltered} isFetching={isFetching}>
      <Select
        items={STATUS_ITEMS}
        value={status}
        onValueChange={(value) => onStatusChange((value ?? "all") as OrderStatusFilter)}
      >
        <SelectTrigger className={cn(controls.select, "w-40 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option} className="capitalize">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={SOURCE_ITEMS}
        value={source}
        onValueChange={(value) => onSourceChange((value ?? "all") as OrderSourceFilter)}
      >
        <SelectTrigger className={cn(controls.select, "w-36 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="pos">POS</SelectItem>
          <SelectItem value="online">Online</SelectItem>
        </SelectContent>
      </Select>

      {/* One range control instead of the two bare date inputs this used to
          have. Those needed their own stacked "From"/"To" captions, which
          made the whole bar two rows tall and left it the only toolbar in
          the app with labels above its controls — and the reports screen
          already had this exact picker. */}
      <DateRangePicker
        dateFrom={dateFrom || undefined}
        dateTo={dateTo || undefined}
        emptyLabel="Any date"
        onApply={(range) => {
          onDateFromChange(range.date_from ?? "");
          onDateToChange(range.date_to ?? "");
        }}
      />
    </FilterBar>
  );
}
