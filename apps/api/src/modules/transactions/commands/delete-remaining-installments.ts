import { TransactionNotFoundError } from "../domain/transaction-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function deleteRemainingInstallments(
  repo: TransactionsRepository,
  input: { id: string; userId: string },
) {
  const deleted = await repo.deleteRemainingInstallments(input);
  if (!deleted) {
    throw new TransactionNotFoundError();
  }
  return deleted;
}
