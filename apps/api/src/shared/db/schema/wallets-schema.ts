import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const wallet = pgTable(
  "wallet",
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("wallet_userId_idx").on(table.userId)],
);

export const walletRelations = relations(wallet, ({ one }) => ({
  user: one(user, {
    fields: [wallet.userId],
    references: [user.id],
  }),
}));
