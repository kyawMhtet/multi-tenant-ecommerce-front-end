"use client";

import { format, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SalesProfitReportDay } from "@/lib/types";

interface OrderCountChartProps {
  daily: SalesProfitReportDay[];
}

const chartConfig = {
  order_count: { label: "Orders", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function OrderCountChart({ daily }: OrderCountChartProps) {
  const data = daily.map((day) => ({
    date: day.date,
    order_count: day.order_count,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => format(parseISO(value), "MMM d")}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} allowDecimals={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => format(parseISO(String(value)), "MMM d, yyyy")}
            />
          }
        />
        <Bar dataKey="order_count" fill="var(--color-order_count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
