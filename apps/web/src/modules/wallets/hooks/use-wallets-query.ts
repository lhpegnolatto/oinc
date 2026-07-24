"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWallets } from "../api";

export const walletsQueryKey = ["wallets"] as const;

export function useWalletsQuery() {
  return useQuery({
    queryKey: walletsQueryKey,
    queryFn: fetchWallets,
  });
}
