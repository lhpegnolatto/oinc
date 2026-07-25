"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuickAddTransaction } from "@/modules/transactions/components/quick-add-transaction-provider";
import { NetWorthTotal } from "@/modules/wallets/components/net-worth-total";
import { WalletEmptyState } from "@/modules/wallets/components/wallet-empty-state";
import { useWalletsQuery } from "@/modules/wallets/hooks/use-wallets-query";
import { RecentTransactions } from "./components/recent-transactions";
import { TopCategories } from "./components/top-categories";
import { WalletBreakdownChart } from "./components/wallet-breakdown-chart";

export function DashboardPage() {
  const { data: wallets, isPending } = useWalletsQuery();
  const { open } = useQuickAddTransaction();

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
        <Button onClick={open}>
          <PlusIcon data-icon="inline-start" />
          Add transaction
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <NetWorthTotal wallets={wallets} />
              <Link
                href="/wallets"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Wallets
              </Link>
            </div>
            <WalletBreakdownChart wallets={wallets} />
          </CardContent>
        </Card>
        <RecentTransactions />
      </div>

      <TopCategories />
    </div>
  );
}
