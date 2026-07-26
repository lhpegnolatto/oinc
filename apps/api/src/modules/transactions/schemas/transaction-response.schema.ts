import type { Transaction } from "../domain/transaction";

export function toTransactionResponse(
  transaction: Omit<Transaction, "userId">,
) {
  return {
    id: transaction.id,
    walletId: transaction.walletId,
    cardId: transaction.cardId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.date,
    note: transaction.note,
    status: transaction.status,
    installmentPlanId: transaction.installmentPlanId,
    installmentNumber: transaction.installmentNumber,
    installmentCount: transaction.installmentCount,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export type TransactionResponse = ReturnType<typeof toTransactionResponse>;

// Variant for the all-wallets list (GET /transactions), which joins `wallet`
// so apps/web can show each row's wallet appearance without an N+1 lookup —
// see design.md decision 1. Never includes card-destination rows (the join
// excludes them — see design.md Decision 4).
export function toTransactionWithWalletResponse(
  transaction: Omit<Transaction, "userId"> & {
    wallet: { id: string; name: string; color: string; icon: string };
  },
) {
  return {
    ...toTransactionResponse(transaction),
    wallet: transaction.wallet,
  };
}

export type TransactionWithWalletResponse = ReturnType<
  typeof toTransactionWithWalletResponse
>;
