"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSalesProfitReport } from "@/lib/api/reports";
import type { SalesProfitReportParams } from "@/lib/types";

export function useSalesProfitReport(params: SalesProfitReportParams) {
  return useQuery({
    queryKey: ["reports", "sales-profit", params],
    queryFn: () => getSalesProfitReport(params),
    placeholderData: keepPreviousData,
  });
}
