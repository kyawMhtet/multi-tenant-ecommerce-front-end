"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchX, Store } from "lucide-react";
import { usePlatformShops } from "@/lib/hooks/usePlatformShops";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { TablePagination } from "@/components/shared/TablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { PlatformShopFilterBar } from "@/components/platform/PlatformShopFilterBar";
import { ShopFlagBadges } from "@/components/platform/ShopFlagBadges";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { describePendingPlan, subscriptionStatusLabel } from "@/lib/platform-shops";
import type { PlatformShopFilters } from "@/lib/types";
import {
  controls,
  statusPill,
  subscriptionStatusClassName,
  typography,
} from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

// "Sells in" and "Billed in" are two columns and never one. They are different
// facts — a Kyat-selling shop can be billed in Baht, because it banks where it
// can actually receive money — and a single "Currency" column would make the
// directory confidently wrong about both.
const COLUMNS = ["Shop", "Plan", "Status", "Sells in", "Billed in", ""] as const;

function ShopTableHead() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNS.map((column, i) => (
          <TableHead
            key={column || i}
            className={i === COLUMNS.length - 1 ? "text-right" : undefined}
          >
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/**
 * Every shop on the platform.
 *
 * The console's home, and the entry point to everything else: /platform/shops
 * is where you land, because every other staff action takes an id and this is
 * the only screen that can tell you one.
 *
 * Nothing here is free text except search. Each filter's value is checked
 * against a catalogue server-side and answers 422 for anything else —
 * deliberately, so a typo can't come back as an empty page that reads "no such
 * shops". Driving the controls from fixed lists is what upholds that.
 */
export default function PlatformShopsPage() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(PER_PAGE_OPTIONS[0]);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400);
  const [selected, setSelected] = useState<PlatformShopFilters>({});

  const filters: PlatformShopFilters = {
    ...selected,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  // Render-phase adjustment rather than an effect, the same pattern the
  // products list uses: React discards this render and re-runs before
  // committing, so the query below is never committed holding the stale page
  // number alongside the new filters.
  const filterKey = JSON.stringify(filters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isPending, isFetching, error } = usePlatformShops(page, perPage, filters);
  const shops = data?.data;
  const meta = data?.meta;
  const isEmpty = shops !== undefined && shops.length === 0;

  function clearFilters() {
    setSearchInput("");
    setSelected({});
  }

  function handlePerPageChange(value: number) {
    setPerPage(value);
    setPage(1);
  }

  return (
    <PageContainer size="full">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Shops"
          eyebrow="Directory"
          description={
            meta
              ? `${meta.total} ${meta.total === 1 ? "shop" : "shops"} ${
                  hasActiveFilters ? "match your filters" : "on the platform"
                }`
              : undefined
          }
        />

        <PlatformShopFilterBar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          filters={selected}
          onFiltersChange={setSelected}
          isFetching={isFetching && !isPending}
          onClear={clearFilters}
          isFiltered={hasActiveFilters}
        />

        {/* A 422 from a bad filter value lands here as its own message rather
            than as an empty table — which is the entire reason the API
            validates them instead of ignoring them. */}
        <ApiErrorState error={error} fallback="Could not load the shop directory." />

        {!error && isPending && (
          <TableCard>
            <Table>
              <ShopTableHead />
              <TableBody>
                <TableSkeleton columns={COLUMNS.length} />
              </TableBody>
            </Table>
          </TableCard>
        )}

        {isEmpty &&
          (hasActiveFilters ? (
            <EmptyState
              icon={SearchX}
              title="No shops match your filters"
              description="Try a different search term, or clear the filters to see every shop."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className={controls.button}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Store}
              title="No shops yet"
              description="Shops appear here as soon as someone signs up."
            />
          ))}

        {shops !== undefined && shops.length > 0 && meta && (
          <TableCard
            footer={
              <TablePagination
                meta={meta}
                page={page}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={PER_PAGE_OPTIONS}
                label="shops"
              />
            }
          >
            <Table className={cn(isFetching && !isPending && "opacity-60 transition-opacity")}>
              <ShopTableHead />
              <TableBody>
                {shops.map((shop) => {
                  const subscription = shop.subscription;
                  const pending = describePendingPlan(subscription);

                  return (
                    <TableRow key={shop.id} className="group">
                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-medium">{shop.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {shop.slug}
                            {shop.owner_email ? ` · ${shop.owner_email}` : ""}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          {/* plan_label straight from the server. A lapsed
                              shop keeps its plan and goes read-only, so
                              inferring one from what it can currently do
                              would demote a paying Pro shop on screen. */}
                          <span>{subscription?.plan_label ?? "—"}</span>
                          {pending && (
                            <span className="truncate text-xs text-muted-foreground">
                              {pending}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {subscription ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                statusPill,
                                subscriptionStatusClassName[subscription.status],
                              )}
                            >
                              {subscriptionStatusLabel(subscription.status)}
                            </Badge>
                          ) : (
                            // Null for a shop created around the app. Named
                            // rather than blank, so it reads as a fact about
                            // the shop and not a rendering failure.
                            <span className={typography.muted}>No subscription</span>
                          )}
                          <ShopFlagBadges shop={shop} />
                        </div>
                      </TableCell>

                      <TableCell className={typography.numeric}>
                        {shop.selling_currency ?? "—"}
                      </TableCell>

                      <TableCell className={typography.numeric}>
                        {subscription?.billing_currency ?? "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        <Link
                          href={`/platform/shops/${shop.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            controls.buttonSm,
                            "text-muted-foreground group-hover:bg-background group-hover:text-foreground",
                          )}
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableCard>
        )}
      </div>
    </PageContainer>
  );
}
