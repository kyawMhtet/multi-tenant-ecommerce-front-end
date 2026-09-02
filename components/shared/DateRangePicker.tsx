"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// Structurally what its callers want — SalesProfitReportParams on the
// reports screen, the date half of OrderFilterParams on the orders list, and
// the from/to pair on the platform ledger (which translates the names at its
// own call site rather than adding a second prop shape here) — so the picker
// doesn't have to know which screen it's on. An empty object means "no range",
// which is how Clear reports itself.
export interface DateRangeValue {
  date_from?: string;
  date_to?: string;
}

interface DateRangePickerProps {
  dateFrom?: string;
  dateTo?: string;
  onApply: (range: DateRangeValue) => void;
  // What the trigger reads with no range set. The reports screen defaults
  // to the current month server-side, so "This month" is the truth there;
  // the orders list applies no date filter at all, where the same words
  // would be a lie.
  emptyLabel?: string;
}

function rangeFromProps(dateFrom?: string, dateTo?: string): DateRange | undefined {
  if (!dateFrom || !dateTo) return undefined;
  return { from: parseISO(dateFrom), to: parseISO(dateTo) };
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onApply,
  emptyLabel = "This month",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(
    rangeFromProps(dateFrom, dateTo),
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // Re-seed from the committed props every time it opens — discards any
      // pending selection left over from a previous Cancel.
      setPendingRange(rangeFromProps(dateFrom, dateTo));
    }
  }

  function handleApply() {
    if (!pendingRange?.from || !pendingRange?.to) return;
    onApply({
      date_from: format(pendingRange.from, "yyyy-MM-dd"),
      date_to: format(pendingRange.to, "yyyy-MM-dd"),
    });
    setOpen(false);
  }

  function handleClear() {
    onApply({});
    setOpen(false);
  }

  const label =
    dateFrom && dateTo
      ? `${format(parseISO(dateFrom), "MMM d, yyyy")} – ${format(parseISO(dateTo), "MMM d, yyyy")}`
      : emptyLabel;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className={cn(controls.button, "font-normal")} />}
      >
        <CalendarIcon className="size-4" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex flex-col">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={pendingRange}
            onSelect={setPendingRange}
            defaultMonth={pendingRange?.from}
          />
          <div className="flex items-center justify-end gap-2 border-t p-2.5">
            <Button type="button" variant="ghost" onClick={handleClear} className={controls.buttonSm}>
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className={controls.buttonSm}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!pendingRange?.from || !pendingRange?.to}
              onClick={handleApply}
              className={controls.buttonSm}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
