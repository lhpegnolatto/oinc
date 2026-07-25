import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function listTransactionsForWallet(
  repo: TransactionsRepository,
  input: { walletId: string; userId: string },
) {
  const owned = await repo.isWalletOwnedByUser(input.walletId, input.userId);
  if (!owned) {
    throw new WalletNotFoundError();
  }
  return repo.findAllForWallet(input.walletId);
}
