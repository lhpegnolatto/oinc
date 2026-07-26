import { ValidationError } from "../../../shared/errors";
import { findVisibleCategory } from "../../categories/queries/find-visible-category";
import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

export async function createCardCharge(
  repo: TransactionsRepository,
  input: {
    userId: string;
    cardId: string;
    categoryId: string;
    amount: number;
    date: string;
    note: string | null;
    status: "pending" | "posted";
  },
) {
  const category = await findVisibleCategory(input.categoryId, input.userId);
  if (!category) {
    throw new ValidationError("Category not found", ["categoryId"]);
  }
  if (category.type !== "expense") {
    throw new ValidationError("Category type does not match transaction type", [
      "categoryId",
    ]);
  }

  const created = await repo.createWithBalanceUpdate({
    id: crypto.randomUUID(),
    userId: input.userId,
    cardId: input.cardId,
    categoryId: input.categoryId,
    type: "expense",
    amount: input.amount,
    date: input.date,
    note: input.note,
    status: input.status,
  });
  if (!created) {
    throw new CreditCardNotFoundError();
  }
  return created;
}
