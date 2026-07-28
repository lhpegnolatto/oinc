import { InvestmentNotFoundError } from "../domain/investment-not-found-error";
import type { InvestmentsRepository } from "../repositories/investments-repository";

export async function updateInvestment(
  repo: InvestmentsRepository,
  input: {
    id: string;
    userId: string;
    name?: string;
    currentValue?: number;
    quantity?: number;
    costBasis?: number;
    color?: string;
    icon?: string;
  },
) {
  const { id, userId, ...changes } = input;
  const updated = await repo.update(id, userId, changes);
  if (!updated) {
    throw new InvestmentNotFoundError();
  }
  return updated;
}
