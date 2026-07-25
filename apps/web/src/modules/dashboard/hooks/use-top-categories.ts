"use client";

import { useMemo } from "react";
import { useAllTransactionsQuery } from "@/modules/transactions/hooks/use-all-transactions-query";
import { useCategoriesQuery } from "@/modules/transactions/hooks/use-categories-query";

export type TopCategory = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function firstOfCurrentMonth() {
  const now = new Date();
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function useTopCategories() {
  const { data: transactions, isPending: transactionsPending } =
    useAllTransactionsQuery({
      type: "expense",
      dateFrom: firstOfCurrentMonth(),
      dateTo: isoDate(new Date()),
    });
  const { data: categories, isPending: categoriesPending } =
    useCategoriesQuery();

  const topCategories = useMemo<TopCategory[]>(() => {
    if (!transactions || !categories) return [];

    const totals = new Map<string, number>();
    for (const transaction of transactions) {
      totals.set(
        transaction.categoryId,
        (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
      );
    }

    return Array.from(totals.entries())
      .map(([categoryId, total]) => {
        const category = categories.find((c) => c.id === categoryId);
        return {
          categoryId,
          name: category?.name ?? "Uncategorized",
          color: category?.color ?? "#71717a",
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  return {
    topCategories,
    isPending: transactionsPending || categoriesPending,
  };
}
