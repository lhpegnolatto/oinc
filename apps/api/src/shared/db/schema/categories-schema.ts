import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { transactionTypeEnum } from "./transaction-type-enum";
import { transaction } from "./transactions-schema";

export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    // null = system-seeded (visible to everyone, immutable); non-null = a
    // user's own custom category (editable/deletable by its owner only).
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: transactionTypeEnum("type").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("category_userId_idx").on(table.userId)],
);

export const categoryRelations = relations(category, ({ one, many }) => ({
  user: one(user, {
    fields: [category.userId],
    references: [user.id],
  }),
  transactions: many(transaction),
}));
