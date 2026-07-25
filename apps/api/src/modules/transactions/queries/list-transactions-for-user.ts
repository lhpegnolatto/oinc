import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function listTransactionsForUser(
  repo: TransactionsRepository,
  input: {
    userId: string;
    walletId?: string;
    categoryId?: string;
    type?: "income" | "expense";
    dateFrom?: string;
    dateTo?: string;
    noteSearch?: string;
    limit?: number;
  },
) {
  return repo.findAllForUser(input);
}
