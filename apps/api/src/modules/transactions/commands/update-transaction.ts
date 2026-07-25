import { ValidationError } from "../../../shared/errors";
import { findVisibleCategory } from "../../categories/queries/find-visible-category";
import { TransactionNotFoundError } from "../domain/transaction-not-found-error";
import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function updateTransaction(
  repo: TransactionsRepository,
  input: {
    id: string;
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

  const result = await repo.updateWithBalanceUpdate(input);
  if (result.kind === "not_found") {
    throw new TransactionNotFoundError();
  }
  if (result.kind === "wallet_not_found") {
    throw new WalletNotFoundError();
  }
  return result.transaction;
}
