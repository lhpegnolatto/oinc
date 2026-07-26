import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import type { CreditCardsRepository } from "../repositories/credit-cards-repository";

export async function updateCreditCard(
  repo: CreditCardsRepository,
  input: {
    id: string;
    userId: string;
    name: string;
    color?: string;
    icon?: string;
    statementCloseDay?: number;
    dueDay?: number;
  },
) {
  const { id, userId, ...changes } = input;
  const updated = await repo.update(id, userId, changes);
  if (!updated) {
    throw new CreditCardNotFoundError();
  }
  return updated;
}
