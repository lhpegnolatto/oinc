"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWalletRequest } from "../api";
import { walletsQueryKey } from "./use-wallets-query";

export function useDeleteWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWalletRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
