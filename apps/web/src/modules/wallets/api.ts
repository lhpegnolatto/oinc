import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import type { InferResponseType } from "hono/client";
import { apiClient } from "@/lib/api-client";

const walletsApi = apiClient.wallets;

export type WalletDto = InferResponseType<typeof walletsApi.$get>[number];

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function fetchWallets() {
  const res = await walletsApi.$get();
  return parseOrThrow<WalletDto[]>(res);
}

export async function createWalletRequest(input: {
  name: string;
  balance: number;
  color: string;
  icon: WalletIconKey;
}) {
  const res = await walletsApi.$post({ json: input });
  return parseOrThrow<WalletDto>(res);
}

export async function updateWalletRequest(
  id: string,
  input: { name: string; color: string; icon: WalletIconKey },
) {
  const res = await walletsApi[":id"].$patch({
    param: { id },
    json: input,
  });
  return parseOrThrow<WalletDto>(res);
}

export async function deleteWalletRequest(id: string) {
  const res = await walletsApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}
