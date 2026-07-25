import type { TransactionDto, TransactionWithWalletDto } from "../api";
import { TransactionListItem } from "./transaction-list-item";

export function TransactionList({
  transactions,
}: {
  transactions: (TransactionDto | TransactionWithWalletDto)[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {transactions.map((transaction) => (
        <TransactionListItem key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
