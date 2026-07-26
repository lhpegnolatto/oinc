"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCardPayments } from "../api";

export function cardPaymentsQueryKey(cardId: string) {
  return ["card-payments", cardId] as const;
}

export function useCardPaymentsQuery(cardId: string) {
  return useQuery({
    queryKey: cardPaymentsQueryKey(cardId),
    queryFn: () => fetchCardPayments(cardId),
  });
}
