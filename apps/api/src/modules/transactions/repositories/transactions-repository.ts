import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import { creditCard, transaction, wallet } from "../../../shared/db/schema";

type DbClient = typeof db;
// The transaction handle a `db.transaction(...)` callback receives — used so
// balance-affecting logic can run either inside a fresh transaction (a single
// create/update/delete) or inside one already opened by a caller wrapping
// several inserts atomically (see createInstallmentPlan below).
type TxClient = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

// A transaction belongs to exactly one of a wallet or a credit card — the DB
// check constraint (transaction_exactly_one_destination) backs this up, but
// every write path here is shaped around the same either/or contract so it
// can never assemble a row that violates it.
type Destination =
  | { walletId: string; cardId?: undefined }
  | { cardId: string; walletId?: undefined };

type TransactionInput = Destination & {
  categoryId: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  note: string | null;
  status?: "pending" | "posted" | null;
  // Null for a non-installment transaction — see design.md Decision 2.
  installmentPlanId?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
};

function balanceDelta(type: "income" | "expense", amount: number) {
  return type === "income" ? amount : -amount;
}

// A card's balance is "money you owe" — every charge logged against a card
// in this change is an expense, so the delta is an unconditional add rather
// than balanceDelta's income/expense branch. See design.md Decision 3.
function cardBalanceDelta(amount: number) {
  return amount;
}

export class TransactionsRepository {
  constructor(private readonly db: DbClient) {}

  async findAllForWallet(walletId: string) {
    return this.db.query.transaction.findMany({
      where: eq(transaction.walletId, walletId),
      orderBy: [desc(transaction.date), desc(transaction.createdAt)],
    });
  }

  async findAllForCard(cardId: string) {
    return this.db.query.transaction.findMany({
      where: eq(transaction.cardId, cardId),
      orderBy: [desc(transaction.date), desc(transaction.createdAt)],
    });
  }

  // Scoped directly by userId (not by iterating each owned wallet) per
  // design.md decision 1 — joins wallet so callers get each row's wallet
  // name/color/icon without N+1 lookups. A walletId/categoryId filter the
  // user doesn't own simply can't match any row already scoped to their own
  // userId, so it naturally yields an empty result rather than needing a
  // separate ownership check. The inner join also means card-destination
  // rows (walletId IS NULL) never appear here — see design.md Decision 4.
  async findAllForUser(filters: {
    userId: string;
    walletId?: string;
    categoryId?: string;
    type?: "income" | "expense";
    dateFrom?: string;
    dateTo?: string;
    noteSearch?: string;
    limit?: number;
  }) {
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
        cardId: transaction.cardId,
        categoryId: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.note,
        status: transaction.status,
        installmentPlanId: transaction.installmentPlanId,
        installmentNumber: transaction.installmentNumber,
        installmentCount: transaction.installmentCount,
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

  // Same as isWalletOwnedByUser, mirrored for the shared `credit_card` table.
  async isCardOwnedByUser(cardId: string, userId: string) {
    const owned = await this.db.query.creditCard.findFirst({
      where: and(eq(creditCard.id, cardId), eq(creditCard.userId, userId)),
      columns: { id: true },
    });
    return !!owned;
  }

  // Insert + apply the matching signed delta against a caller-supplied
  // transaction handle — the shared core of createWithBalanceUpdate (one row,
  // its own fresh transaction) and createInstallmentPlan (N rows, one shared
  // outer transaction). Locks the target wallet or card FOR UPDATE first
  // (also proves ownership — no row means the caller should treat this as
  // "not found").
  private async insertWithBalanceUpdate(
    tx: TxClient,
    input: { id: string } & TransactionInput,
  ) {
    if (input.cardId) {
      const [lockedCard] = await tx
        .select({ id: creditCard.id })
        .from(creditCard)
        .where(
          and(
            eq(creditCard.id, input.cardId),
            eq(creditCard.userId, input.userId),
          ),
        )
        .for("update");
      if (!lockedCard) return null;

      const [created] = await tx
        .insert(transaction)
        .values({
          id: input.id,
          walletId: null,
          cardId: input.cardId,
          categoryId: input.categoryId,
          userId: input.userId,
          type: input.type,
          amount: input.amount,
          date: input.date,
          note: input.note,
          status: input.status ?? null,
          installmentPlanId: input.installmentPlanId ?? null,
          installmentNumber: input.installmentNumber ?? null,
          installmentCount: input.installmentCount ?? null,
        })
        .returning();

      await tx
        .update(creditCard)
        .set({
          balance: sql`${creditCard.balance} + ${cardBalanceDelta(input.amount)}`,
        })
        .where(eq(creditCard.id, input.cardId));

      return created;
    }

    const walletId = input.walletId as string;

    const [lockedWallet] = await tx
      .select({ id: wallet.id })
      .from(wallet)
      .where(and(eq(wallet.id, walletId), eq(wallet.userId, input.userId)))
      .for("update");
    if (!lockedWallet) return null;

    const [created] = await tx
      .insert(transaction)
      .values({
        id: input.id,
        walletId,
        cardId: null,
        categoryId: input.categoryId,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        note: input.note,
        status: input.status ?? null,
        installmentPlanId: input.installmentPlanId ?? null,
        installmentNumber: input.installmentNumber ?? null,
        installmentCount: input.installmentCount ?? null,
      })
      .returning();

    await tx
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} + ${balanceDelta(input.type, input.amount)}`,
      })
      .where(eq(wallet.id, walletId));

    return created;
  }

  // Create: a single row, in its own fresh DB transaction.
  async createWithBalanceUpdate(input: { id: string } & TransactionInput) {
    return this.db.transaction((tx) => this.insertWithBalanceUpdate(tx, input));
  }

  // Create an installment plan: every row's insert+balance-update runs
  // through the same insertWithBalanceUpdate used for a single charge, but
  // all inside one outer DB transaction so a failure on any installment (e.g.
  // a concurrent card delete) rolls back the whole plan — see design.md
  // Decision 3. Returns null (rolling back) if any installment's
  // insertWithBalanceUpdate returns null.
  async createInstallmentPlan(inputs: ({ id: string } & TransactionInput)[]) {
    return this.db.transaction(async (tx) => {
      const created: NonNullable<
        Awaited<ReturnType<typeof this.insertWithBalanceUpdate>>
      >[] = [];
      for (const input of inputs) {
        const row = await this.insertWithBalanceUpdate(tx, input);
        if (!row) return null;
        created.push(row);
      }
      return created;
    });
  }

  // Update: lock the transaction row FOR UPDATE first, so the "old" delta
  // reversed below always reflects the current committed state, not a
  // possibly-stale value read before this call — this is what keeps two
  // concurrent edits of the same transaction from corrupting the
  // wallet/card balance (see design.md's concurrency risk). Locks both the
  // old and new destination (deduped, id-sorted) to avoid deadlocking
  // against a concurrent edit moving a transaction the opposite direction
  // between the same two wallets/cards. Only wallet→wallet and card→card
  // moves are supported (design.md Non-Goal) — a request that tries to
  // convert between the two destination kinds is rejected as
  // "destination_mismatch" before any lock beyond the transaction row itself.
  async updateWithBalanceUpdate(
    input: { id: string } & TransactionInput,
  ): Promise<
    | { kind: "not_found" }
    | { kind: "wallet_not_found" }
    | { kind: "card_not_found" }
    | { kind: "destination_mismatch" }
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

      const existingIsCard = existing.cardId !== null;
      const inputIsCard = input.cardId !== undefined;
      if (existingIsCard !== inputIsCard) {
        return { kind: "destination_mismatch" };
      }

      if (inputIsCard) {
        const cardIds = Array.from(
          new Set([existing.cardId as string, input.cardId as string]),
        ).sort();
        for (const id of cardIds) {
          const [lockedCard] = await tx
            .select({ id: creditCard.id })
            .from(creditCard)
            .where(
              and(eq(creditCard.id, id), eq(creditCard.userId, input.userId)),
            )
            .for("update");
          if (!lockedCard) return { kind: "card_not_found" };
        }

        await tx
          .update(creditCard)
          .set({
            balance: sql`${creditCard.balance} - ${cardBalanceDelta(existing.amount)}`,
          })
          .where(eq(creditCard.id, existing.cardId as string));

        await tx
          .update(creditCard)
          .set({
            balance: sql`${creditCard.balance} + ${cardBalanceDelta(input.amount)}`,
          })
          .where(eq(creditCard.id, input.cardId as string));

        const [updated] = await tx
          .update(transaction)
          .set({
            cardId: input.cardId,
            categoryId: input.categoryId,
            type: input.type,
            amount: input.amount,
            date: input.date,
            note: input.note,
            status: input.status ?? null,
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
      }

      const walletIds = Array.from(
        new Set([existing.walletId as string, input.walletId as string]),
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
        .where(eq(wallet.id, existing.walletId as string));

      await tx
        .update(wallet)
        .set({
          balance: sql`${wallet.balance} + ${balanceDelta(input.type, input.amount)}`,
        })
        .where(eq(wallet.id, input.walletId as string));

      const [updated] = await tx
        .update(transaction)
        .set({
          walletId: input.walletId,
          categoryId: input.categoryId,
          type: input.type,
          amount: input.amount,
          date: input.date,
          note: input.note,
          status: null,
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

  // Reverse a locked-and-loaded row's balance delta and delete it — shared
  // core of deleteWithBalanceUpdate (one row) and deleteRemainingInstallments
  // (each row in a plan's tail), same as insertWithBalanceUpdate's role for
  // creates.
  private async removeWithBalanceUpdate(
    tx: TxClient,
    existing: typeof transaction.$inferSelect,
  ) {
    if (existing.cardId) {
      await tx
        .select({ id: creditCard.id })
        .from(creditCard)
        .where(eq(creditCard.id, existing.cardId))
        .for("update");

      await tx
        .update(creditCard)
        .set({
          balance: sql`${creditCard.balance} - ${cardBalanceDelta(existing.amount)}`,
        })
        .where(eq(creditCard.id, existing.cardId));
    } else {
      await tx
        .select({ id: wallet.id })
        .from(wallet)
        .where(eq(wallet.id, existing.walletId as string))
        .for("update");

      await tx
        .update(wallet)
        .set({
          balance: sql`${wallet.balance} - ${balanceDelta(existing.type, existing.amount)}`,
        })
        .where(eq(wallet.id, existing.walletId as string));
    }

    const [deleted] = await tx
      .delete(transaction)
      .where(
        and(
          eq(transaction.id, existing.id),
          eq(transaction.userId, existing.userId),
        ),
      )
      .returning();

    return deleted;
  }

  // Delete: lock the transaction row (proves ownership) then its
  // destination, reverse the delta, delete the row — all in one DB
  // transaction.
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

      return this.removeWithBalanceUpdate(tx, existing);
    });
  }

  // Delete an installment and every sibling in the same plan dated on or
  // after it (design.md Decision 6). Returns null (rolling back) if the
  // target row doesn't exist, isn't owned by this user, or isn't part of an
  // installment plan.
  async deleteRemainingInstallments(input: { id: string; userId: string }) {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(transaction)
        .where(
          and(
            eq(transaction.id, input.id),
            eq(transaction.userId, input.userId),
          ),
        )
        .for("update");
      if (!target?.installmentPlanId) return null;

      const siblings = await tx
        .select()
        .from(transaction)
        .where(
          and(
            eq(transaction.installmentPlanId, target.installmentPlanId),
            eq(transaction.userId, input.userId),
            gte(transaction.date, target.date),
          ),
        )
        .for("update");

      const deleted: (typeof transaction.$inferSelect)[] = [];
      for (const row of siblings) {
        const removed = await this.removeWithBalanceUpdate(tx, row);
        if (removed) deleted.push(removed);
      }
      return deleted;
    });
  }
}
