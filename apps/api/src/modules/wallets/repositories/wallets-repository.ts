import { and, eq } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import { wallet } from "../../../shared/db/schema";

type DbClient = typeof db;

export class WalletsRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: {
    id: string;
    userId: string;
    name: string;
    balance: number;
    color: string;
    icon: string;
  }) {
    const [created] = await this.db.insert(wallet).values(input).returning();
    return created;
  }

  async findAllByUserId(userId: string) {
    return this.db.query.wallet.findMany({
      where: eq(wallet.userId, userId),
    });
  }

  async update(
    id: string,
    userId: string,
    changes: { name: string; color?: string; icon?: string },
  ) {
    const [updated] = await this.db
      .update(wallet)
      .set(changes)
      .where(and(eq(wallet.id, id), eq(wallet.userId, userId)))
      .returning();
    return updated;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await this.db
      .delete(wallet)
      .where(and(eq(wallet.id, id), eq(wallet.userId, userId)))
      .returning();
    return deleted;
  }
}
