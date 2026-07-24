"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWalletRequest } from "../api";
import { walletsQueryKey } from "./use-wallets-query";

export function useCreateWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWalletRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
