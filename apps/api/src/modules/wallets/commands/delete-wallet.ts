import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { WalletsRepository } from "../repositories/wallets-repository";

export async function deleteWallet(
  repo: WalletsRepository,
  input: { id: string; userId: string },
) {
  const deleted = await repo.delete(input.id, input.userId);
  if (!deleted) {
    throw new WalletNotFoundError();
  }
}
