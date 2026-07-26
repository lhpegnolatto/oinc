export interface Transaction {
  id: string;
  // Exactly one of walletId / cardId is set — enforced at the DB layer by
  // transaction_exactly_one_destination (see transactions-schema.ts).
  walletId: string | null;
  cardId: string | null;
  categoryId: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  note: string | null;
  // Meaningful only when cardId is set; null for wallet-destination rows.
  status: "pending" | "posted" | null;
  // Null for a non-installment transaction; shared across a plan's rows
  // otherwise — see transactions-schema.ts.
  installmentPlanId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}
