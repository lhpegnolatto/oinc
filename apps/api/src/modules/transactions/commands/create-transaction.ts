import { ValidationError } from "../../../shared/errors";
import { findVisibleCategory } from "../../categories/queries/find-visible-category";
import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function createTransaction(
  repo: TransactionsRepository,
  input: {
    userId: string;
    walletId: string;
    categoryId: string;
    type: "income" | "expense";
    amount: number;
    date: string;
    note: string | null;
  },
) {
  const category = await findVisibleCategory(input.categoryId, input.userId);
  if (!category) {
    throw new ValidationError("Category not found", ["categoryId"]);
  }
  if (category.type !== input.type) {
    throw new ValidationError("Category type does not match transaction type", [
      "categoryId",
    ]);
  }

  const created = await repo.createWithBalanceUpdate({
    id: crypto.randomUUID(),
    status: null,
    ...input,
  });
  if (!created) {
    throw new WalletNotFoundError();
  }
  return created;
}
