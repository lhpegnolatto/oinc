"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletsQueryKey } from "@/modules/wallets/hooks/use-wallets-query";
import { createTransactionRequest } from "../api";
import { walletTransactionsQueryKey } from "./use-wallet-transactions-query";

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      walletId,
      ...input
    }: {
      walletId: string;
      type: "income" | "expense";
      amount: number;
      categoryId: string;
      date: string;
      note?: string;
    }) => createTransactionRequest(walletId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: walletTransactionsQueryKey(variables.walletId),
      });
      // Balance changed — the wallets list (and any wallet header reading
      // from it) must refetch too.
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
