"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSalesProfitReport } from "@/lib/api/reports";
import type { SalesProfitReportParams } from "@/lib/types";

export function useSalesProfitReport(
  params: SalesProfitReportParams,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["reports", "sales-profit", params],
    queryFn: () => getSalesProfitReport(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
