"use client";

import type { InvestmentIconKey } from "@oinc/api/investment-appearance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateInvestmentRequest } from "../api";
import { investmentsQueryKey } from "./use-investments-query";

export function useUpdateInvestmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      currentValue?: number;
      quantity?: number;
      costBasis?: number;
      color?: string;
      icon?: InvestmentIconKey;
    }) => updateInvestmentRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentsQueryKey });
    },
  });
}
