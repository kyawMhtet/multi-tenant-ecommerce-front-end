"use client";

import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RAIL_OPTIONS, SHOP_STATUS_OPTIONS } from "@/lib/platform-shops";
import {
  PLATFORM_PLANS,
  SHOP_CURRENCIES,
  type PlatformPlan,
  type PlatformShopFilters,
  type PlatformSubscriptionStatus,
  type ShopCurrency,
  type BillingRail,
} from "@/lib/types";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * The directory's filters.
 *
 * Every one is a fixed list, and that is a correctness decision rather than a
 * convenience: the API validates each value against a catalogue and answers
 * 422 for anything else, deliberately, so that a typo can't come back as an
 * empty page reading "no such shops". A select cannot produce an invalid
 * value; a text box eventually will. Search is the one free-text field, and
 * it's the one parameter with no catalogue behind it.
 *
 * Base UI's <Select.Value> renders the raw value unless the root is handed an
 * `items` label map — it doesn't read the matching <Select.Item>'s children
 * the way Radix does. Hence the maps below; without them a trigger reads
 * "past_due" instead of "Past due".
 */

const PLAN_ITEMS: Record<string, string> = {
  all: "All plans",
  starter: "Starter",
  pro: "Pro",
};

const STATUS_ITEMS: Record<string, string> = {
  all: "All statuses",
  ...Object.fromEntries(SHOP_STATUS_OPTIONS.map((o) => [o.value, o.label])),
};

const RAIL_ITEMS: Record<string, string> = {
  all: "All rails",
  ...Object.fromEntries(RAIL_OPTIONS.map((o) => [o.value, o.label])),
};

// The SELLING currency — what the shop trades in, not what it pays us. Three
// values here against billing's two, which is exactly why the label says
// "Sells in" rather than "Currency".
const CURRENCY_ITEMS: Record<string, string> = {
  all: "Sells in: any",
  ...Object.fromEntries(SHOP_CURRENCIES.map((code) => [code, `Sells in ${code}`])),
};

// Both booleans are real questions here, unlike a "low stock only" toggle:
// "not suspended" is a filter someone genuinely wants when checking whether a
// suspension actually landed. So this is a three-state select, not a toggle.
const SUSPENDED_ITEMS: Record<string, string> = {
  all: "Any suspension",
  yes: "Suspended",
  no: "Not suspended",
};

interface PlatformShopFilterBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  filters: PlatformShopFilters;
  onFiltersChange: (filters: PlatformShopFilters) => void;
  isFetching?: boolean;
  onClear: () => void;
  isFiltered: boolean;
}

export function PlatformShopFilterBar({
  searchInput,
  onSearchInputChange,
  filters,
  onFiltersChange,
  isFetching,
  onClear,
  isFiltered,
}: PlatformShopFilterBarProps) {
  // One patch helper rather than six props: the filters travel to the API as a
  // single object, so they're held as one here too and can't drift apart.
  //
  // An undefined value DELETES its key rather than sitting on the object as
  // `{ plan: undefined }`. Spreading it back in would leave the key present,
  // and the page counts Object.keys() to decide whether anything is filtered —
  // so clearing a select would have left "Clear filters" on screen and the
  // filtered-to-nothing empty state showing over an unfiltered list.
  function patch(next: Partial<PlatformShopFilters>) {
    const merged: PlatformShopFilters = { ...filters, ...next };
    for (const key of Object.keys(next) as (keyof PlatformShopFilters)[]) {
      if (next[key] === undefined) delete merged[key];
    }
    onFiltersChange(merged);
  }

  return (
    <FilterBar
      onClear={onClear}
      isFiltered={isFiltered}
      search={
        <SearchInput
          value={searchInput}
          onChange={onSearchInputChange}
          label="Search shops"
          placeholder="Shop name, slug, or owner email…"
          isFetching={isFetching}
        />
      }
    >
      <Select
        items={PLAN_ITEMS}
        value={filters.plan ?? "all"}
        onValueChange={(value) =>
          patch({ plan: !value || value === "all" ? undefined : (value as PlatformPlan) })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-34 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All plans</SelectItem>
          {PLATFORM_PLANS.map((plan) => (
            <SelectItem key={plan} value={plan}>
              {PLAN_ITEMS[plan]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={STATUS_ITEMS}
        value={filters.status ?? "all"}
        onValueChange={(value) =>
          patch({
            status:
              !value || value === "all" ? undefined : (value as PlatformSubscriptionStatus),
          })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-38 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {SHOP_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
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
          patch({ currency: !value || value === "all" ? undefined : (value as ShopCurrency) })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-38 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Sells in: any</SelectItem>
          {SHOP_CURRENCIES.map((code) => (
            <SelectItem key={code} value={code}>
              Sells in {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={SUSPENDED_ITEMS}
        value={filters.suspended === undefined ? "all" : filters.suspended ? "yes" : "no"}
        onValueChange={(value) =>
          patch({ suspended: !value || value === "all" ? undefined : value === "yes" })
        }
      >
        <SelectTrigger className={cn(controls.select, "w-38 shrink-0")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any suspension</SelectItem>
          <SelectItem value="yes">Suspended</SelectItem>
          <SelectItem value="no">Not suspended</SelectItem>
        </SelectContent>
      </Select>
    </FilterBar>
  );
}
