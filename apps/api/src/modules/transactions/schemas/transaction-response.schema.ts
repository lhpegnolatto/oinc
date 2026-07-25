import type { Transaction } from "../domain/transaction";

export function toTransactionResponse(
  transaction: Omit<Transaction, "userId">,
) {
  return {
    id: transaction.id,
    walletId: transaction.walletId,
    categoryId: transaction.categoryId,
    type: transaction.type,
    amount: transaction.amount,
    date: transaction.date,
    note: transaction.note,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export type TransactionResponse = ReturnType<typeof toTransactionResponse>;

// Variant for the all-wallets list (GET /transactions), which joins `wallet`
// so apps/web can show each row's wallet appearance without an N+1 lookup —
// see design.md decision 1.
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
