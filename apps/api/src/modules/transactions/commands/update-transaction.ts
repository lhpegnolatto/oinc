import { ValidationError } from "../../../shared/errors";
import { findVisibleCategory } from "../../categories/queries/find-visible-category";
import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import { TransactionNotFoundError } from "../domain/transaction-not-found-error";
import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

type UpdateTransactionInput =
  | {
      id: string;
      userId: string;
      walletId: string;
      type: "income" | "expense";
      amount: number;
      categoryId: string;
      date: string;
      note: string | null;
    }
  | {
      id: string;
      userId: string;
      cardId: string;
      amount: number;
      categoryId: string;
      date: string;
      note: string | null;
      status: "pending" | "posted";
    };

export async function updateTransaction(
  repo: TransactionsRepository,
  input: UpdateTransactionInput,
) {
  const isCardCharge = "cardId" in input;
  const type = isCardCharge ? "expense" : input.type;

  const category = await findVisibleCategory(input.categoryId, input.userId);
  if (!category) {
    throw new ValidationError("Category not found", ["categoryId"]);
  }
  if (category.type !== type) {
    throw new ValidationError("Category type does not match transaction type", [
      "categoryId",
    ]);
  }

  const result = isCardCharge
    ? await repo.updateWithBalanceUpdate({
        id: input.id,
        userId: input.userId,
        cardId: input.cardId,
        categoryId: input.categoryId,
        type,
        amount: input.amount,
        date: input.date,
        note: input.note,
        status: input.status,
      })
    : await repo.updateWithBalanceUpdate({
        id: input.id,
        userId: input.userId,
        walletId: input.walletId,
        categoryId: input.categoryId,
        type,
        amount: input.amount,
        date: input.date,
        note: input.note,
        status: null,
      });

  if (result.kind === "not_found") {
    throw new TransactionNotFoundError();
  }
  if (result.kind === "wallet_not_found") {
    throw new WalletNotFoundError();
  }
  if (result.kind === "card_not_found") {
    throw new CreditCardNotFoundError();
  }
  if (result.kind === "destination_mismatch") {
    throw new ValidationError(
      "Cannot move a transaction between a wallet and a credit card",
      ["cardId"],
    );
  }
  return result.transaction;
}
