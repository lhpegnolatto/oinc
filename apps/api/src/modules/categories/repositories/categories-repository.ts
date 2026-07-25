import { and, count, eq, isNull, or } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import { category, transaction } from "../../../shared/db/schema";

type DbClient = typeof db;

export class CategoriesRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: {
    id: string;
    userId: string;
    name: string;
    type: "income" | "expense";
    color: string;
    icon: string;
  }) {
    const [created] = await this.db.insert(category).values(input).returning();
    return created;
  }

  async findAllVisibleToUser(userId: string) {
    return this.db.query.category.findMany({
      where: or(isNull(category.userId), eq(category.userId, userId)),
    });
  }

  async findOwnedById(id: string, userId: string) {
    return this.db.query.category.findFirst({
      where: and(eq(category.id, id), eq(category.userId, userId)),
    });
  }

  async findVisibleById(id: string, userId: string) {
    return this.db.query.category.findFirst({
      where: and(
        eq(category.id, id),
        or(isNull(category.userId), eq(category.userId, userId)),
      ),
    });
  }

  async update(
    id: string,
    userId: string,
    changes: { name: string; color?: string; icon?: string },
  ) {
    const [updated] = await this.db
      .update(category)
      .set(changes)
      .where(and(eq(category.id, id), eq(category.userId, userId)))
      .returning();
    return updated;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await this.db
      .delete(category)
      .where(and(eq(category.id, id), eq(category.userId, userId)))
      .returning();
    return deleted;
  }

  async countTransactionsUsingCategory(id: string) {
    const [row] = await this.db
      .select({ count: count() })
      .from(transaction)
      .where(eq(transaction.categoryId, id));
    return row?.count ?? 0;
  }
}
