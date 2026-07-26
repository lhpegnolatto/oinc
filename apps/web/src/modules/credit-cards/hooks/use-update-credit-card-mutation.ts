"use client";

import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCreditCardRequest } from "../api";
import { creditCardsQueryKey } from "./use-credit-cards-query";

export function useUpdateCreditCardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name: string;
      statementCloseDay: number;
      dueDay: number;
      color: string;
      icon: CreditCardIconKey;
    }) => updateCreditCardRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey });
    },
  });
}
