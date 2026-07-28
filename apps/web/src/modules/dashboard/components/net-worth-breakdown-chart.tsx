"use client";

import { Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { InvestmentDto } from "@/modules/investments/api";
import type { WalletDto } from "@/modules/wallets/api";

type Slice = { key: string; name: string; color: string; value: number };

// Balance/value <= 0 can't be a pie slice (no negative/zero share to render) —
// still counted in the totals above this chart, just excluded here. Credit
// card balances never appear here (design.md Decision 2): a liability isn't
// a share of the positive whole a pie chart represents.
export function NetWorthBreakdownChart({
  wallets,
  investments,
}: {
  wallets: WalletDto[];
  investments: InvestmentDto[];
}) {
  const slices: Slice[] = [
    ...wallets
      .filter((wallet) => wallet.balance > 0)
      .map((wallet) => ({
        key: `wallet:${wallet.id}`,
        name: wallet.name,
        color: wallet.color,
        value: wallet.balance,
      })),
    ...investments
      .filter((investment) => investment.currentValue > 0)
      .map((investment) => ({
        key: `investment:${investment.id}`,
        name: investment.name,
        color: investment.color,
        value: investment.currentValue,
      })),
  ];

  if (slices.length === 0) {
    return null;
  }

  const config = slices.reduce<ChartConfig>((acc, slice) => {
    acc[slice.key] = { label: slice.name, color: slice.color };
    return acc;
  }, {});

  const data = slices.map((slice) => ({
    sliceKey: slice.key,
    value: slice.value,
    fill: slice.color,
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="sliceKey" hideLabel />}
        />
        <Pie data={data} dataKey="value" nameKey="sliceKey" innerRadius={60} />
        <ChartLegend content={<ChartLegendContent nameKey="sliceKey" />} />
      </PieChart>
    </ChartContainer>
  );
}
