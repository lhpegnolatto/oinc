"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCardCharges } from "../api";

export function cardChargesQueryKey(cardId: string) {
  return ["card-charges", cardId] as const;
}

export function useCardChargesQuery(cardId: string) {
  return useQuery({
    queryKey: cardChargesQueryKey(cardId),
    queryFn: () => fetchCardCharges(cardId),
  });
}
