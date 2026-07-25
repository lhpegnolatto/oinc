"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllTransactions, type TransactionFilters } from "../api";

export function allTransactionsQueryKey(filters: TransactionFilters) {
  return ["all-transactions", filters] as const;
}

export function useAllTransactionsQuery(filters: TransactionFilters) {
  return useQuery({
    queryKey: allTransactionsQueryKey(filters),
    queryFn: () => fetchAllTransactions(filters),
  });
}
