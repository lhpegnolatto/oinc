import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { category } from "./categories-schema";
import { creditCard } from "./credit-cards-schema";
import { transactionStatusEnum } from "./transaction-status-enum";
import { transactionTypeEnum } from "./transaction-type-enum";
import { wallet } from "./wallets-schema";

export const transaction = pgTable(
  "transaction",
  {
    id: text("id").primaryKey(),
    // Nullable: a transaction belongs to exactly one of a wallet or a credit
    // card, enforced by transaction_exactly_one_destination below.
    walletId: text("wallet_id").references(() => wallet.id, {
      onDelete: "cascade",
    }),
    cardId: text("card_id").references(() => creditCard.id, {
      onDelete: "cascade",
    }),
    // Meaningful only when cardId is set (pending/posted); null for
    // wallet-destination rows.
    status: transactionStatusEnum("status"),
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
    // Null for a non-installment transaction. Shared across a plan's rows
    // (installmentPlanId), with each row's 1-based position and the plan's
    // total (installmentNumber/installmentCount) — see design.md Decision 2.
    installmentPlanId: text("installment_plan_id"),
    installmentNumber: integer("installment_number"),
    installmentCount: integer("installment_count"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("transaction_walletId_idx").on(table.walletId),
    index("transaction_cardId_idx").on(table.cardId),
    index("transaction_categoryId_idx").on(table.categoryId),
    index("transaction_userId_idx").on(table.userId),
    index("transaction_walletId_date_idx").on(table.walletId, table.date),
    index("transaction_cardId_date_idx").on(table.cardId, table.date),
    index("transaction_userId_date_idx").on(table.userId, table.date),
    index("transaction_installmentPlanId_idx").on(table.installmentPlanId),
    check(
      "transaction_exactly_one_destination",
      sql`(${table.walletId} IS NOT NULL) <> (${table.cardId} IS NOT NULL)`,
    ),
  ],
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  wallet: one(wallet, {
    fields: [transaction.walletId],
    references: [wallet.id],
  }),
  creditCard: one(creditCard, {
    fields: [transaction.cardId],
    references: [creditCard.id],
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
