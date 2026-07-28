import type { InvestmentsRepository } from "../repositories/investments-repository";

export async function listInvestments(
  repo: InvestmentsRepository,
  userId: string,
) {
  return repo.findAllByUserId(userId);
}
