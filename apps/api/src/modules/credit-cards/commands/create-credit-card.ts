import type { CreditCardsRepository } from "../repositories/credit-cards-repository";

export async function createCreditCard(
  repo: CreditCardsRepository,
  input: {
    userId: string;
    name: string;
    balance: number;
    color: string;
    icon: string;
    statementCloseDay: number;
    dueDay: number;
  },
) {
  return repo.create({ id: crypto.randomUUID(), ...input });
}
