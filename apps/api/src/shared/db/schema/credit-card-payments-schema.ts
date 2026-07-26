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
import { creditCard } from "./credit-cards-schema";
import { wallet } from "./wallets-schema";

// A payment against a credit card, sourced from a wallet — deliberately not a
// `transaction` row (no categoryId, decreases rather than increases what's
// owed). See design.md Decision 1.
export const creditCardPayment = pgTable(
  "credit_card_payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => creditCard.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallet.id, { onDelete: "cascade" }),
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
    index("credit_card_payment_userId_idx").on(table.userId),
    index("credit_card_payment_cardId_idx").on(table.cardId),
    index("credit_card_payment_walletId_idx").on(table.walletId),
    index("credit_card_payment_cardId_date_idx").on(table.cardId, table.date),
    index("credit_card_payment_walletId_date_idx").on(
      table.walletId,
      table.date,
    ),
  ],
);

export const creditCardPaymentRelations = relations(
  creditCardPayment,
  ({ one }) => ({
    user: one(user, {
      fields: [creditCardPayment.userId],
      references: [user.id],
    }),
    creditCard: one(creditCard, {
      fields: [creditCardPayment.cardId],
      references: [creditCard.id],
    }),
    wallet: one(wallet, {
      fields: [creditCardPayment.walletId],
      references: [wallet.id],
    }),
  }),
);
