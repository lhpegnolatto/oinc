import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import type { CreditCardsRepository } from "../repositories/credit-cards-repository";

export async function deleteCreditCard(
  repo: CreditCardsRepository,
  input: { id: string; userId: string },
) {
  const deleted = await repo.delete(input.id, input.userId);
  if (!deleted) {
    throw new CreditCardNotFoundError();
  }
}
