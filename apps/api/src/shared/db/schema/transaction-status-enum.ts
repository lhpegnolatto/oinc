import { pgEnum } from "drizzle-orm/pg-core";

// Meaningful only when transaction.cardId is set (a credit card charge) —
// null for every wallet-destination row. See transaction_exactly_one_destination
// in transactions-schema.ts.
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "posted",
]);
