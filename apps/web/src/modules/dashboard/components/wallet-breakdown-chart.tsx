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
import type { WalletDto } from "@/modules/wallets/api";

// Balance <= 0 can't be a pie slice (no negative/zero share to render) —
// still counted in NetWorthTotal above this chart, just excluded here.
export function WalletBreakdownChart({ wallets }: { wallets: WalletDto[] }) {
  const slices = wallets.filter((wallet) => wallet.balance > 0);

  if (slices.length === 0) {
    return null;
  }

  const config = slices.reduce<ChartConfig>((acc, wallet) => {
    acc[wallet.id] = { label: wallet.name, color: wallet.color };
    return acc;
  }, {});

  const data = slices.map((wallet) => ({
    walletId: wallet.id,
    value: wallet.balance,
    fill: wallet.color,
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="walletId" hideLabel />}
        />
        <Pie data={data} dataKey="value" nameKey="walletId" innerRadius={60} />
        <ChartLegend content={<ChartLegendContent nameKey="walletId" />} />
      </PieChart>
    </ChartContainer>
  );
}
