import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import type { CreditCardPaymentsRepository } from "../repositories/credit-card-payments-repository";
import type { CreditCardsRepository } from "../repositories/credit-cards-repository";

export async function listPaymentsForCard(
  repos: {
    creditCards: CreditCardsRepository;
    payments: CreditCardPaymentsRepository;
  },
  input: { cardId: string; userId: string },
) {
  const owned = await repos.creditCards.findOwnedById(
    input.cardId,
    input.userId,
  );
  if (!owned) {
    throw new CreditCardNotFoundError();
  }
  return repos.payments.findAllForCard(input.cardId);
}
