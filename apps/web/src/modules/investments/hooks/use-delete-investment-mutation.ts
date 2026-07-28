"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteInvestmentRequest } from "../api";
import { investmentsQueryKey } from "./use-investments-query";

export function useDeleteInvestmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInvestmentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentsQueryKey });
    },
  });
}
