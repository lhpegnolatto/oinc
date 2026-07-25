"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWalletTransactions } from "../api";

export function walletTransactionsQueryKey(walletId: string) {
  return ["wallet-transactions", walletId] as const;
}

export function useWalletTransactionsQuery(walletId: string) {
  return useQuery({
    queryKey: walletTransactionsQueryKey(walletId),
    queryFn: () => fetchWalletTransactions(walletId),
  });
}
