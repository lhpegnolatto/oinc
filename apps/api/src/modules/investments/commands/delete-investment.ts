import { InvestmentNotFoundError } from "../domain/investment-not-found-error";
import type { InvestmentsRepository } from "../repositories/investments-repository";

export async function deleteInvestment(
  repo: InvestmentsRepository,
  input: { id: string; userId: string },
) {
  const deleted = await repo.delete(input.id, input.userId);
  if (!deleted) {
    throw new InvestmentNotFoundError();
  }
}
