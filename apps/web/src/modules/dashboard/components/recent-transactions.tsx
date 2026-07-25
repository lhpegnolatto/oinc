"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AllTransactionsEmptyState } from "@/modules/transactions/components/all-transactions-empty-state";
import { TransactionList } from "@/modules/transactions/components/transaction-list";
import { useAllTransactionsQuery } from "@/modules/transactions/hooks/use-all-transactions-query";

const RECENT_TRANSACTIONS_LIMIT = 5;

export function RecentTransactions() {
  const { data: transactions, isPending } = useAllTransactionsQuery({
    limit: RECENT_TRANSACTIONS_LIMIT,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : transactions && transactions.length > 0 ? (
          <TransactionList transactions={transactions} />
        ) : (
          <AllTransactionsEmptyState
            hasActiveFilters={false}
            onClearFilters={() => {}}
          />
        )}
        <Link
          href="/transactions"
          className={buttonVariants({ variant: "outline", className: "w-fit" })}
        >
          See all
        </Link>
      </CardContent>
    </Card>
  );
}
