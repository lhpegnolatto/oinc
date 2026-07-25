import { pgEnum } from "drizzle-orm/pg-core";

// Shared by category.type and transaction.type — a transaction's categoryId
// must reference a category whose type matches its own (enforced in the
// transactions module's commands, not just here). Kept in its own file since
// both categories-schema.ts and transactions-schema.ts need it at
// pgTable-definition time (not lazily), and those two files already import
// each other for relations.
export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);
