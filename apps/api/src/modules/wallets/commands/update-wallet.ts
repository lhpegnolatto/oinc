import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { WalletsRepository } from "../repositories/wallets-repository";

export async function updateWallet(
  repo: WalletsRepository,
  input: {
    id: string;
    userId: string;
    name: string;
    color?: string;
    icon?: string;
  },
) {
  const { id, userId, ...changes } = input;
  const updated = await repo.update(id, userId, changes);
  if (!updated) {
    throw new WalletNotFoundError();
  }
  return updated;
}
