"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletsQueryKey } from "@/modules/wallets/hooks/use-wallets-query";
import { updateTransactionRequest } from "../api";
import { walletTransactionsQueryKey } from "./use-wallet-transactions-query";

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      previousWalletId,
      ...input
    }: {
      id: string;
      previousWalletId: string;
      walletId: string;
      type: "income" | "expense";
      amount: number;
      categoryId: string;
      date: string;
      note?: string;
    }) => updateTransactionRequest(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: walletTransactionsQueryKey(variables.previousWalletId),
      });
      if (variables.walletId !== variables.previousWalletId) {
        queryClient.invalidateQueries({
          queryKey: walletTransactionsQueryKey(variables.walletId),
        });
      }
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
