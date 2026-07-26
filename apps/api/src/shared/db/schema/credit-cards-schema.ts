import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { creditCardPayment } from "./credit-card-payments-schema";
import { transaction } from "./transactions-schema";

export const creditCard = pgTable(
  "credit_card",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    balance: numeric("balance", {
      precision: 14,
      scale: 2,
      mode: "number",
    }).notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    statementCloseDay: integer("statement_close_day").notNull(),
    dueDay: integer("due_day").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("credit_card_userId_idx").on(table.userId)],
);

export const creditCardRelations = relations(creditCard, ({ one, many }) => ({
  user: one(user, {
    fields: [creditCard.userId],
    references: [user.id],
  }),
  transactions: many(transaction),
  payments: many(creditCardPayment),
}));
