"use client";

import { FilterBar } from "@/components/shared/FilterBar";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RAIL_OPTIONS } from "@/lib/platform-shops";
import {
  PLATFORM_INVOICE_STATUSES,
  type BillingRail,
  type PlatformInvoiceFilters,
  type PlatformInvoiceStatus,
  type BillingCurrency,
} from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

// The same words invoiceStatusLabel() prints on the rows, so a filter can
// never offer a term the table doesn't use — "failed" reads as "Rejected"
// because on the manual rail that is what it means, and "void" reads as
// "Superseded" because nothing was refused.
//
// `pending` is the one that can't be quoted verbatim: per row that label
// splits on whether a screenshot exists ("Awaiting review" vs "Awaiting
// payment"), and a filter selects the whole bucket rather than either half.
const STATUS_LABELS: Record<PlatformInvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Rejected",
  void: "Superseded",
};

const STATUS_ITEMS: Record<string, string> = {
  all: "All statuses",
  ...STATUS_LABELS,
};

const RAIL_ITEMS: Record<string, string> = {
  all: "All rails",
  ...Object.fromEntries(RAIL_OPTIONS.map((o) => [o.value, o.label])),
};

// The BILLING currencies — the two the platform can receive. Not the three a
// shop can sell in; that distinction is the whole reason both facts exist.
const CURRENCY_ITEMS: Record<string, string> = {
  all: "Any currency",
  THB: "THB",
  MMK: "MMK",
};

interface PlatformInvoiceFilterBarProps {
  filters: PlatformInvoiceFilters;
  onFiltersChange: (filters: PlatformInvoiceFilters) => void;
  // Raw text for the shop-id box, held by the page: an in-progress "1" on the
  // way to "12" must not fire a request for shop 1, and an empty box has to
  // stay empty rather than snapping back to a number.
  shopIdInput: string;
  onShopIdInputChange: (value: string) => void;
  isFetching?: boolean;
  onClear: () => void;
  isFiltered: boolean;
}

/**
 * The ledger's filters — what you reconcile a bank statement against.
 *
 * Same fixed-list discipline as the shop directory: every value except the
 * shop id is validated against a catalogue server-side and answers 422 for
 * anything else, so a select is what keeps a typo from reading as "no such
 * invoices".
 *
 * The date range covers the whole `to` day — the API compares with whereDate,
 * so entering a month end means "up to and including", which is what a
 * reconciler means by it.
 */
export function PlatformInvoiceFilterBar({
  filters,
  onFiltersChange,
  shopIdInput,
  onShopIdInputChange,
  isFetching,
  onClear,
  isFiltered,
}: PlatformInvoiceFilterBarProps) {
  // An undefined value deletes its key rather than lingering as
  // `{ status: undefined }` — see the same helper in PlatformShopFilterBar for
  // why that distinction is load-bearing.
  function patch(next: Partial<PlatformInvoiceFilters>) {
    const merged: PlatformInvoiceFilters = { ...filters, ...next };
    for (const key of Object.keys(next) as (keyof PlatformInvoiceFilters)[]) {
      if (next[key] === undefined) delete merged[key];
    }
    onFiltersChange(merged);
  }

  return (
    <FilterBar onClear={onClear} isFiltered={isFiltered} isFetching={isFetching}>
      <Select
        items={STATUS_ITEMS}
        value={filters.status ?? "all"}
        onValueChange={(value) =>
          patch({ status: !value || value === "all" ? undefined : (value as PlatformInvoiceStatus) })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-40 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {PLATFORM_INVOICE_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={RAIL_ITEMS}
        value={filters.rail ?? "all"}
        onValueChange={(value) =>
          patch({ rail: !value || value === "all" ? undefined : (value as BillingRail) })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-38 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All rails</SelectItem>
          {RAIL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={CURRENCY_ITEMS}
        value={filters.currency ?? "all"}
        onValueChange={(value) =>
          patch({ currency: !value || value === "all" ? undefined : (value as BillingCurrency) })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-36 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any currency</SelectItem>
          <SelectItem value="THB">THB</SelectItem>
          <SelectItem value="MMK">MMK</SelectItem>
        </SelectContent>
      </Select>

      <DateRangePicker
        dateFrom={filters.from}
        dateTo={filters.to}
        // DateRangePicker speaks date_from/date_to (the reports and orders
        // screens' shape); this endpoint calls them from/to. Translated here
        // rather than adding a second prop shape to a component two other
        // screens already share.
        onApply={(range) => patch({ from: range.date_from, to: range.date_to })}
        emptyLabel="Any date"
      />

      {/* The one free-text control, and the one filter with no catalogue
          behind it: tenant_id is just an integer server-side. It's how "which
          payment do you mean" gets answered from a support thread that only
          quotes a shop id — the review queue prints one on every card. */}
      <Label className="flex shrink-0 items-center gap-2 font-normal">
        <span className="text-sm text-muted-foreground">Shop ID</span>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="Any"
          value={shopIdInput}
          onChange={(e) => onShopIdInputChange(e.target.value)}
          className={cn(controls.input, "w-24 bg-card")}
        />
      </Label>
    </FilterBar>
  );
}
