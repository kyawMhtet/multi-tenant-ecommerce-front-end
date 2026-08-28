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
import type { SalesProfitReportParams } from "@/lib/types";

interface DateRangePickerProps {
  dateFrom?: string;
  dateTo?: string;
  onApply: (range: SalesProfitReportParams) => void;
}

function rangeFromProps(dateFrom?: string, dateTo?: string): DateRange | undefined {
  if (!dateFrom || !dateTo) return undefined;
  return { from: parseISO(dateFrom), to: parseISO(dateTo) };
}

export function DateRangePicker({ dateFrom, dateTo, onApply }: DateRangePickerProps) {
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
      : "This month";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
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
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!pendingRange?.from || !pendingRange?.to}
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
