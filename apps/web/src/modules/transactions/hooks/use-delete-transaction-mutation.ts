"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletsQueryKey } from "@/modules/wallets/hooks/use-wallets-query";
import { deleteTransactionRequest } from "../api";
import { walletTransactionsQueryKey } from "./use-wallet-transactions-query";

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; walletId: string }) =>
      deleteTransactionRequest(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: walletTransactionsQueryKey(variables.walletId),
      });
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
