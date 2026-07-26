import { and, desc, eq, sql } from "drizzle-orm";
import type { db } from "../../../shared/db/client";
import {
  creditCard,
  creditCardPayment,
  wallet,
} from "../../../shared/db/schema";

type DbClient = typeof db;
type TxClient = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export class CreditCardPaymentsRepository {
  constructor(private readonly db: DbClient) {}

  async findAllForCard(cardId: string) {
    return this.db.query.creditCardPayment.findMany({
      where: eq(creditCardPayment.cardId, cardId),
      orderBy: [
        desc(creditCardPayment.date),
        desc(creditCardPayment.createdAt),
      ],
    });
  }

  // Locks the target wallet and credit card rows FOR UPDATE in id-sorted
  // order (mirrors TransactionsRepository.updateWithBalanceUpdate's
  // two-destination locking — see design.md Decision 3), verifies both are
  // owned by the requesting user, inserts the payment row, decrements both
  // balances — all in one DB transaction.
  async createWithBalanceUpdate(input: {
    id: string;
    userId: string;
    cardId: string;
    walletId: string;
    amount: number;
    date: string;
    note: string | null;
  }): Promise<
    | { kind: "card_not_found" }
    | { kind: "wallet_not_found" }
    | { kind: "success"; payment: typeof creditCardPayment.$inferSelect }
  > {
    return this.db.transaction(async (tx) => {
      const lockCard = async () => {
        const [locked] = await tx
          .select({ id: creditCard.id })
          .from(creditCard)
          .where(
            and(
              eq(creditCard.id, input.cardId),
              eq(creditCard.userId, input.userId),
            ),
          )
          .for("update");
        return !!locked;
      };
      const lockWallet = async () => {
        const [locked] = await tx
          .select({ id: wallet.id })
          .from(wallet)
          .where(
            and(eq(wallet.id, input.walletId), eq(wallet.userId, input.userId)),
          )
          .for("update");
        return !!locked;
      };

      if (input.cardId < input.walletId) {
        if (!(await lockCard())) return { kind: "card_not_found" };
        if (!(await lockWallet())) return { kind: "wallet_not_found" };
      } else {
        if (!(await lockWallet())) return { kind: "wallet_not_found" };
        if (!(await lockCard())) return { kind: "card_not_found" };
      }

      const [created] = await tx
        .insert(creditCardPayment)
        .values({
          id: input.id,
          userId: input.userId,
          cardId: input.cardId,
          walletId: input.walletId,
          amount: input.amount,
          date: input.date,
          note: input.note,
        })
        .returning();

      await tx
        .update(creditCard)
        .set({ balance: sql`${creditCard.balance} - ${input.amount}` })
        .where(eq(creditCard.id, input.cardId));

      await tx
        .update(wallet)
        .set({ balance: sql`${wallet.balance} - ${input.amount}` })
        .where(eq(wallet.id, input.walletId));

      return { kind: "success", payment: created };
    });
  }

  // Reverses both balance deltas and deletes the row — mirrors
  // TransactionsRepository.deleteWithBalanceUpdate.
  async deleteWithBalanceUpdate(input: { id: string; userId: string }) {
    return this.db.transaction(async (tx: TxClient) => {
      const [existing] = await tx
        .select()
        .from(creditCardPayment)
        .where(
          and(
            eq(creditCardPayment.id, input.id),
            eq(creditCardPayment.userId, input.userId),
          ),
        )
        .for("update");
      if (!existing) return null;

      await tx
        .update(creditCard)
        .set({ balance: sql`${creditCard.balance} + ${existing.amount}` })
        .where(eq(creditCard.id, existing.cardId));

      await tx
        .update(wallet)
        .set({ balance: sql`${wallet.balance} + ${existing.amount}` })
        .where(eq(wallet.id, existing.walletId));

      const [deleted] = await tx
        .delete(creditCardPayment)
        .where(
          and(
            eq(creditCardPayment.id, input.id),
            eq(creditCardPayment.userId, input.userId),
          ),
        )
        .returning();

      return deleted;
    });
  }
}
