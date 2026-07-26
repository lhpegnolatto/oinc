import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function listChargesForCard(
  repo: TransactionsRepository,
  input: { cardId: string; userId: string },
) {
  const owned = await repo.isCardOwnedByUser(input.cardId, input.userId);
  if (!owned) {
    throw new CreditCardNotFoundError();
  }
  return repo.findAllForCard(input.cardId);
}
