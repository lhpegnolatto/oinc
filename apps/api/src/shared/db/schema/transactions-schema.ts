import { relations } from "drizzle-orm";
import {
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { category } from "./categories-schema";
import { transactionTypeEnum } from "./transaction-type-enum";
import { wallet } from "./wallets-schema";

export const transaction = pgTable(
  "transaction",
  {
    id: text("id").primaryKey(),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallet.id, { onDelete: "cascade" }),
    // Restrict (the drizzle-kit default): a category in use can't be deleted
    // out from under a transaction — enforced explicitly in the categories
    // module's deleteCategory command via a count check, this FK is the
    // last-resort DB-level backstop.
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", {
      precision: 14,
      scale: 2,
      mode: "number",
    }).notNull(),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("transaction_walletId_idx").on(table.walletId),
    index("transaction_categoryId_idx").on(table.categoryId),
    index("transaction_userId_idx").on(table.userId),
    index("transaction_walletId_date_idx").on(table.walletId, table.date),
    index("transaction_userId_date_idx").on(table.userId, table.date),
  ],
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  wallet: one(wallet, {
    fields: [transaction.walletId],
    references: [wallet.id],
  }),
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id],
  }),
}));
