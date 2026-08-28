import { apiFetch } from "@/lib/api-client";
import type { ApiResource, SalesProfitReport, SalesProfitReportParams } from "@/lib/types";

// Matches ReportController::salesProfit / SalesProfitReportRequest — verified
// directly against the Laravel source.
export function getSalesProfitReport(
  params: SalesProfitReportParams = {},
): Promise<SalesProfitReport> {
  const query = new URLSearchParams();
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  const qs = query.toString();

  return apiFetch<ApiResource<SalesProfitReport>>(
    `/api/v1/reports/sales-profit${qs ? `?${qs}` : ""}`,
  ).then((res) => res.data);
}
