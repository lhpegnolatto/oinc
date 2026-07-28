"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvestmentRequest } from "../api";
import { investmentsQueryKey } from "./use-investments-query";

export function useCreateInvestmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvestmentRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentsQueryKey });
    },
  });
}
