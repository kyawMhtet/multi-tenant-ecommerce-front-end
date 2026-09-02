"use client";

import { format, parseISO } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SalesProfitReportDay } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

interface SalesProfitChartProps {
  daily: SalesProfitReportDay[];
  currency: string;
}

const chartConfig = {
  // "Sales", not "Revenue": this series is goods only — the backend moved
  // delivery fees out of it, and they never appear in `daily` at all.
  revenue: { label: "Sales", color: "var(--chart-1)" },
  cost: { label: "Cost", color: "var(--chart-2)" },
  profit: { label: "Profit", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function SalesProfitChart({ daily, currency }: SalesProfitChartProps) {
  const data = daily.map((day) => ({
    date: day.date,
    revenue: Number(day.revenue),
    cost: Number(day.cost),
    profit: Number(day.profit),
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <ComposedChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => format(parseISO(value), "MMM d")}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => format(parseISO(String(value)), "MMM d, yyyy")}
              formatter={(value, name) => (
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                  </span>
                  <span className="ml-4 font-mono font-medium text-foreground tabular-nums">
                    {formatCurrency(Number(value), currency)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
        <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
        <Line
          dataKey="profit"
          stroke="var(--color-profit)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
