"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCreditCardRequest } from "../api";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useDeleteCreditCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCreditCardRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
    },
  });
}
