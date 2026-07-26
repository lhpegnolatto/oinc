"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { walletsQueryKey } from "@/modules/wallets/hooks/use-wallets-query";
import { createCardPaymentRequest } from "../api";
import { cardPaymentsQueryKey } from "./use-card-payments-query";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useCreateCreditCardPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      ...input
    }: {
      cardId: string;
      amount: number;
      date: string;
      note?: string;
      walletId: string;
    }) => createCardPaymentRequest(cardId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: cardPaymentsQueryKey(variables.cardId),
      });
      // Balance changed on both the card and the source wallet.
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
