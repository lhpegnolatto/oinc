"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCardChargeRequest } from "../api";
import { cardChargesQueryKey } from "./use-card-charges-query";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useUpdateCardChargeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      previousCardId,
      ...input
    }: {
      id: string;
      previousCardId: string;
      cardId: string;
      amount: number;
      categoryId: string;
      date: string;
      note?: string;
      status: "pending" | "posted";
    }) => updateCardChargeRequest(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: cardChargesQueryKey(variables.previousCardId),
      });
      if (variables.cardId !== variables.previousCardId) {
        queryClient.invalidateQueries({
          queryKey: cardChargesQueryKey(variables.cardId),
        });
      }
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
    },
  });
}
