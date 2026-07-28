import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const investment = pgTable(
  "investment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // 20/8 (not the 14/2 used for money elsewhere) to hold fractional
    // crypto/share amounts without truncation — the only non-money numeric
    // column in this schema, see design.md Decision 2.
    quantity: numeric("quantity", { precision: 20, scale: 8, mode: "number" }),
    costBasis: numeric("cost_basis", {
      precision: 14,
      scale: 2,
      mode: "number",
    }),
    currentValue: numeric("current_value", {
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
  (table) => [index("investment_userId_idx").on(table.userId)],
);

export const investmentRelations = relations(investment, ({ one }) => ({
  user: one(user, {
    fields: [investment.userId],
    references: [user.id],
  }),
}));
