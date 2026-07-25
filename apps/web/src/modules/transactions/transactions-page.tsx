"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AllTransactionsEmptyState } from "./components/all-transactions-empty-state";
import { TransactionList } from "./components/transaction-list";
import { TransactionsFilterBar } from "./components/transactions-filter-bar";
import { useAllTransactionsQuery } from "./hooks/use-all-transactions-query";
import { useTransactionsFilters } from "./hooks/use-transactions-filters";

export function TransactionsPage() {
  const [filters, setFilters] = useTransactionsFilters();
  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== null,
  );
  const { data: transactions, isPending } = useAllTransactionsQuery({
    walletId: filters.wallet ?? undefined,
    categoryId: filters.category ?? undefined,
    type: filters.type ?? undefined,
    dateFrom: filters.dateFrom ?? undefined,
    dateTo: filters.dateTo ?? undefined,
    noteSearch: filters.q ?? undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <TransactionsFilterBar />

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : transactions && transactions.length > 0 ? (
        <TransactionList transactions={transactions} />
      ) : (
        <AllTransactionsEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => setFilters(null)}
        />
      )}
    </div>
  );
}
