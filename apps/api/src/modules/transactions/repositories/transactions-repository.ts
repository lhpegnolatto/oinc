import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import { transaction, wallet } from "../../../shared/db/schema";

type DbClient = typeof db;

type TransactionInput = {
  walletId: string;
  categoryId: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  note: string | null;
};

type ListForUserFilters = {
  userId: string;
  walletId?: string;
  categoryId?: string;
  type?: "income" | "expense";
  dateFrom?: string;
  dateTo?: string;
  noteSearch?: string;
  limit?: number;
};

function balanceDelta(type: "income" | "expense", amount: number) {
  return type === "income" ? amount : -amount;
}

export class TransactionsRepository {
  constructor(private readonly db: DbClient) {}

  async findAllForWallet(walletId: string) {
    return this.db.query.transaction.findMany({
      where: eq(transaction.walletId, walletId),
      orderBy: [desc(transaction.date), desc(transaction.createdAt)],
    });
  }

  // Scoped directly by userId (not by iterating each owned wallet) per
  // design.md decision 1 — joins wallet so callers get each row's wallet
  // name/color/icon without N+1 lookups. A walletId/categoryId filter the
  // user doesn't own simply can't match any row already scoped to their own
  // userId, so it naturally yields an empty result rather than needing a
  // separate ownership check.
  async findAllForUser(filters: ListForUserFilters) {
    const conditions = [eq(transaction.userId, filters.userId)];
    if (filters.walletId) {
      conditions.push(eq(transaction.walletId, filters.walletId));
    }
    if (filters.categoryId) {
      conditions.push(eq(transaction.categoryId, filters.categoryId));
    }
    if (filters.type) {
      conditions.push(eq(transaction.type, filters.type));
    }
    if (filters.dateFrom) {
      conditions.push(gte(transaction.date, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(transaction.date, filters.dateTo));
    }
    if (filters.noteSearch) {
      conditions.push(ilike(transaction.note, `%${filters.noteSearch}%`));
    }

    const query = this.db
      .select({
        id: transaction.id,
        walletId: transaction.walletId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.note,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          color: wallet.color,
          icon: wallet.icon,
        },
      })
      .from(transaction)
      .innerJoin(wallet, eq(transaction.walletId, wallet.id))
      .where(and(...conditions))
      .orderBy(desc(transaction.date), desc(transaction.createdAt));

    if (filters.limit) {
      return query.limit(filters.limit);
    }
    return query;
  }

  async findOwnedById(id: string, userId: string) {
    return this.db.query.transaction.findFirst({
      where: and(eq(transaction.id, id), eq(transaction.userId, userId)),
    });
  }

  // Read-only check against the shared `wallet` table — allowed per
  // design.md/backend.md alongside the balance-bookkeeping writes below;
  // never routes through the wallets module's own repository/commands.
  async isWalletOwnedByUser(walletId: string, userId: string) {
    const owned = await this.db.query.wallet.findFirst({
      where: and(eq(wallet.id, walletId), eq(wallet.userId, userId)),
      columns: { id: true },
    });
    return !!owned;
  }

  // Create: lock the target wallet FOR UPDATE (also proves ownership — no
  // row means the caller should treat this as "wallet not found"), insert
  // the transaction row, then apply the signed delta to balance — all in one
  // DB transaction so a concurrent write serializes on the wallet row lock.
  async createWithBalanceUpdate(input: { id: string } & TransactionInput) {
    return this.db.transaction(async (tx) => {
      const [lockedWallet] = await tx
        .select({ id: wallet.id })
        .from(wallet)
        .where(
          and(eq(wallet.id, input.walletId), eq(wallet.userId, input.userId)),
        )
        .for("update");
      if (!lockedWallet) return null;

      const [created] = await tx.insert(transaction).values(input).returning();

      await tx
        .update(wallet)
        .set({
          balance: sql`${wallet.balance} + ${balanceDelta(input.type, input.amount)}`,
        })
        .where(eq(wallet.id, input.walletId));

      return created;
    });
  }

  // Update: lock the transaction row FOR UPDATE first, so the "old" delta
  // reversed below always reflects the current committed state, not a
  // possibly-stale value read before this call — this is what keeps two
  // concurrent edits of the same transaction from corrupting the wallet
  // balance (see design.md's concurrency risk). Locks both the old and new
  // wallet (deduped, id-sorted) to avoid deadlocking against a concurrent
  // edit moving a transaction the opposite direction between the same two
  // wallets.
  async updateWithBalanceUpdate(
    input: { id: string } & TransactionInput,
  ): Promise<
    | { kind: "not_found" }
    | { kind: "wallet_not_found" }
    | { kind: "success"; transaction: typeof transaction.$inferSelect }
  > {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(transaction)
        .where(
          and(
            eq(transaction.id, input.id),
            eq(transaction.userId, input.userId),
          ),
        )
        .for("update");
      if (!existing) return { kind: "not_found" };

      const walletIds = Array.from(
        new Set([existing.walletId, input.walletId]),
      ).sort();
      for (const id of walletIds) {
        const [lockedWallet] = await tx
          .select({ id: wallet.id })
          .from(wallet)
          .where(and(eq(wallet.id, id), eq(wallet.userId, input.userId)))
          .for("update");
        if (!lockedWallet) return { kind: "wallet_not_found" };
      }

      await tx
        .update(wallet)
        .set({
          balance: sql`${wallet.balance} - ${balanceDelta(existing.type, existing.amount)}`,
        })
        .where(eq(wallet.id, existing.walletId));

      await tx
        .update(wallet)
        .set({
          balance: sql`${wallet.balance} + ${balanceDelta(input.type, input.amount)}`,
        })
        .where(eq(wallet.id, input.walletId));

      const [updated] = await tx
        .update(transaction)
        .set({
          walletId: input.walletId,
          categoryId: input.categoryId,
          type: input.type,
          amount: input.amount,
          date: input.date,
          note: input.note,
        })
        .where(
          and(
            eq(transaction.id, input.id),
            eq(transaction.userId, input.userId),
          ),
        )
        .returning();

      if (!updated) return { kind: "not_found" };
      return { kind: "success", transaction: updated };
    });
  }

  // Delete: lock the transaction row (proves ownership) then its wallet,
  // reverse the delta, delete the row — all in one DB transaction.
  async deleteWithBalanceUpdate(input: { id: string; userId: string }) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(transaction)
        .where(
          and(
            eq(transaction.id, input.id),
            eq(transaction.userId, input.userId),
          ),
        )
        .for("update");
      if (!existing) return null;

      await tx
        .select({ id: wallet.id })
        .from(wallet)
        .where(eq(wallet.id, existing.walletId))
        .for("update");

      await tx
        .update(wallet)
        .set({
          balance: sql`${wallet.balance} - ${balanceDelta(existing.type, existing.amount)}`,
        })
        .where(eq(wallet.id, existing.walletId));

      const [deleted] = await tx
        .delete(transaction)
        .where(
          and(
            eq(transaction.id, input.id),
            eq(transaction.userId, input.userId),
          ),
        )
        .returning();

      return deleted;
    });
  }
}
