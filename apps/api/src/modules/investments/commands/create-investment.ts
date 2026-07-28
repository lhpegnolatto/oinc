import type { InvestmentsRepository } from "../repositories/investments-repository";

export async function createInvestment(
  repo: InvestmentsRepository,
  input: {
    userId: string;
    name: string;
    currentValue: number;
    quantity?: number;
    costBasis?: number;
    color: string;
    icon: string;
  },
) {
  return repo.create({ id: crypto.randomUUID(), ...input });
}
