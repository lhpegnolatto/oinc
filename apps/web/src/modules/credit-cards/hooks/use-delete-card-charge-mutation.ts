"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCardChargeRequest } from "../api";
import { cardChargesQueryKey } from "./use-card-charges-query";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useDeleteCardChargeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; cardId: string }) =>
      deleteCardChargeRequest(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: cardChargesQueryKey(variables.cardId),
      });
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
    },
  });
}
