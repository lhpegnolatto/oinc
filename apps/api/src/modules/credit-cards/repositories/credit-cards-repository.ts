import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import { creditCard, transaction } from "../../../shared/db/schema";

type DbClient = typeof db;

export class CreditCardsRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: {
    id: string;
    userId: string;
    name: string;
    balance: number;
    color: string;
    icon: string;
    statementCloseDay: number;
    dueDay: number;
  }) {
    const [created] = await this.db
      .insert(creditCard)
      .values(input)
      .returning();
    return created;
  }

  async findAllByUserId(userId: string) {
    return this.db.query.creditCard.findMany({
      where: eq(creditCard.userId, userId),
    });
  }

  async findOwnedById(id: string, userId: string) {
    return this.db.query.creditCard.findFirst({
      where: and(eq(creditCard.id, id), eq(creditCard.userId, userId)),
    });
  }

  // Statement total for a closed cycle — a read against the shared
  // `transaction` table this module doesn't own, same "shared-table access
  // from a module that doesn't own that table" precedent as
  // TransactionsRepository reaching into `creditCard`/`wallet` (design.md
  // Decision 2). Date range is inclusive on both ends.
  async sumPostedChargesInRange(
    cardId: string,
    dateFrom: string,
    dateTo: string,
  ) {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${transaction.amount}), 0)` })
      .from(transaction)
      .where(
        and(
          eq(transaction.cardId, cardId),
          eq(transaction.status, "posted"),
          gte(transaction.date, dateFrom),
          lte(transaction.date, dateTo),
        ),
      );
    return Number(row?.total ?? 0);
  }

  async update(
    id: string,
    userId: string,
    changes: {
      name: string;
      color?: string;
      icon?: string;
      statementCloseDay?: number;
      dueDay?: number;
    },
  ) {
    const [updated] = await this.db
      .update(creditCard)
      .set(changes)
      .where(and(eq(creditCard.id, id), eq(creditCard.userId, userId)))
      .returning();
    return updated;
  }

  async delete(id: string, userId: string) {
    const [deleted] = await this.db
      .delete(creditCard)
      .where(and(eq(creditCard.id, id), eq(creditCard.userId, userId)))
      .returning();
    return deleted;
  }
}
