import { ValidationError } from "../../../shared/errors";
import { findVisibleCategory } from "../../categories/queries/find-visible-category";
import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import type { TransactionsRepository } from "../repositories/transactions-repository";

// One installment per calendar month starting from `date` — no day-of-month
// clamping beyond what JS Date already does (design.md Decision 5).
function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day))
    .toISOString()
    .slice(0, 10);
}

// total / count rounded to 2 decimals for every installment but the last,
// which absorbs whatever remains — guarantees the sum always equals `total`
// exactly (design.md Decision 4).
function splitAmount(total: number, count: number): number[] {
  const perInstallment = Math.round((total / count) * 100) / 100;
  const amounts = Array.from({ length: count - 1 }, () => perInstallment);
  const runningTotal = amounts.reduce((sum, amount) => sum + amount, 0);
  amounts.push(Math.round((total - runningTotal) * 100) / 100);
  return amounts;
}

export async function createCardChargeInstallmentPlan(
  repo: TransactionsRepository,
  input: {
    userId: string;
    cardId: string;
    categoryId: string;
    amount: number;
    date: string;
    note: string | null;
    status: "pending" | "posted";
    count: number;
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

  const installmentPlanId = crypto.randomUUID();
  const amounts = splitAmount(input.amount, input.count);

  const created = await repo.createInstallmentPlan(
    amounts.map((amount, index) => ({
      id: crypto.randomUUID(),
      userId: input.userId,
      cardId: input.cardId,
      categoryId: input.categoryId,
      type: "expense" as const,
      amount,
      date: addMonths(input.date, index),
      note: input.note,
      status: input.status,
      installmentPlanId,
      installmentNumber: index + 1,
      installmentCount: input.count,
    })),
  );
  if (!created) {
    throw new CreditCardNotFoundError();
  }
  return created;
}
