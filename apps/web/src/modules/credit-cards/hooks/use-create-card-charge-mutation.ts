"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCardChargeRequest } from "../api";
import { cardChargesQueryKey } from "./use-card-charges-query";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useCreateCardChargeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      ...input
    }: {
      cardId: string;
      amount: number;
      categoryId: string;
      date: string;
      note?: string;
      status: "pending" | "posted";
      count?: number;
    }) => createCardChargeRequest(cardId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: cardChargesQueryKey(variables.cardId),
      });
      // Balance changed — the credit cards list (and any card header reading
      // from it) must refetch too.
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
    },
  });
}
