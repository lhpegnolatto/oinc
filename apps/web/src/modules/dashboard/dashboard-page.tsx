"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreditCardsQuery } from "@/modules/credit-cards/hooks/use-credit-cards-query";
import { useInvestmentsQuery } from "@/modules/investments/hooks/use-investments-query";
import { useQuickAddTransaction } from "@/modules/transactions/components/quick-add-transaction-provider";
import { WalletEmptyState } from "@/modules/wallets/components/wallet-empty-state";
import { useWalletsQuery } from "@/modules/wallets/hooks/use-wallets-query";
import { NetWorthBreakdownChart } from "./components/net-worth-breakdown-chart";
import { NetWorthSummary } from "./components/net-worth-summary";
import { RecentTransactions } from "./components/recent-transactions";
import { TopCategories } from "./components/top-categories";
import { useNetWorth } from "./hooks/use-net-worth";

export function DashboardPage() {
  const { data: wallets, isPending: walletsPending } = useWalletsQuery();
  const { isPending: cardsPending } = useCreditCardsQuery();
  const { data: investments, isPending: investmentsPending } =
    useInvestmentsQuery();
  const { netWorth, walletsTotal, investmentsTotal, cardsTotal } =
    useNetWorth();
  const { open } = useQuickAddTransaction();

  const isPending = walletsPending || cardsPending || investmentsPending;

  if (isPending) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!wallets || wallets.length === 0) {
    return <WalletEmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/investments"
            className={buttonVariants({ variant: "outline" })}
          >
            Investments
          </Link>
          <Button onClick={open}>
            <PlusIcon data-icon="inline-start" />
            Add transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <NetWorthSummary
                netWorth={netWorth}
                walletsTotal={walletsTotal}
                investmentsTotal={investmentsTotal}
                cardsTotal={cardsTotal}
              />
              <Link
                href="/wallets"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Wallets
              </Link>
            </div>
            <NetWorthBreakdownChart
              wallets={wallets}
              investments={investments ?? []}
            />
          </CardContent>
        </Card>
        <RecentTransactions />
      </div>

      <TopCategories />
    </div>
  );
}
