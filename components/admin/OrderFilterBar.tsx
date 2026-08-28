"use client";

import { Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
}: OrderFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        items={STATUS_ITEMS}
        value={status}
        onValueChange={(value) => onStatusChange((value ?? "all") as OrderStatusFilter)}
      >
        <SelectTrigger size="sm" className="w-36">
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
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="pos">POS</SelectItem>
          <SelectItem value="online">Online</SelectItem>
        </SelectContent>
      </Select>

      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-xs text-muted-foreground">From</span>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-7 w-36"
        />
      </Label>

      <Label className="flex flex-col items-stretch gap-1">
        <span className="text-xs text-muted-foreground">To</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-7 w-36"
        />
      </Label>

      {isFetching && (
        <Loader2Icon
          className="size-4 shrink-0 animate-spin text-muted-foreground"
          aria-label="Loading orders from the server"
        />
      )}
    </div>
  );
}
