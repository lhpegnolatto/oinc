"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCreditCardRequest } from "../api";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useCreateCreditCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCreditCardRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
    },
  });
}
