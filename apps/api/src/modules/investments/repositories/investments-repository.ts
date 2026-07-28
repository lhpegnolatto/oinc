import { and, eq } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import { investment } from "../../../shared/db/schema";

type DbClient = typeof db;

export class InvestmentsRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: {
    id: string;
    userId: string;
    name: string;
    currentValue: number;
    quantity?: number;
    costBasis?: number;
    color: string;
    icon: string;
  }) {
    const [created] = await this.db
      .insert(investment)
      .values(input)
      .returning();
    return created;
  }

  async findAllByUserId(userId: string) {
    return this.db.query.investment.findMany({
      where: eq(investment.userId, userId),
    });
  }

  async update(
    id: string,
    userId: string,
    changes: {
      name?: string;
      currentValue?: number;
      quantity?: number;
      costBasis?: number;
      color?: string;
      icon?: string;
    },
  ) {
    const [updated] = await this.db
      .update(investment)
      .set(changes)
      .where(and(eq(investment.id, id), eq(investment.userId, userId)))
      .returning();
    return updated;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await this.db
      .delete(investment)
      .where(and(eq(investment.id, id), eq(investment.userId, userId)))
      .returning();
    return deleted;
  }
}
