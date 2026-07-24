"use client";

import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWalletRequest } from "../api";
import { walletsQueryKey } from "./use-wallets-query";

export function useUpdateWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name: string;
      color: string;
      icon: WalletIconKey;
    }) => updateWalletRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsQueryKey });
    },
  });
}
