"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletsQueryKey } from "@/modules/wallets/hooks/use-wallets-query";
import { deleteCardPaymentRequest } from "../api";
import { cardPaymentsQueryKey } from "./use-card-payments-query";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useDeleteCreditCardPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; cardId: string }) =>
      deleteCardPaymentRequest(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: cardPaymentsQueryKey(variables.cardId),
      });
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
