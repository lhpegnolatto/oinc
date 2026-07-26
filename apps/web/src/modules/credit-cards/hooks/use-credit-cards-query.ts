"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCreditCards } from "../api";

export const creditCardsQueryKey = ["credit-cards"] as const;

export function useCreditCardsQuery() {
  return useQuery({
    queryKey: creditCardsQueryKey,
    queryFn: fetchCreditCards,
  });
}
