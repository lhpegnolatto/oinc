import type { CreditCardsRepository } from "../repositories/credit-cards-repository";

export async function listCreditCards(
  repo: CreditCardsRepository,
  userId: string,
) {
  return repo.findAllByUserId(userId);
}
