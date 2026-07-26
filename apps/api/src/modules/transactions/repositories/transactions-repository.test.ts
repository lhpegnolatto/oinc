import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";
import { creditCard, transaction, wallet } from "../../../shared/db/schema";

// Mirrors the controller tests' approach — a test-only Better Auth instance
// sharing the same DB + secret as the real `auth`.
const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [testUtils()],
});

async function createUser(emailPrefix: string) {
  const ctx = await testAuth.$context;
  const { test: helpers } = ctx;
  const user = helpers.createUser({
    email: `${emailPrefix}-${crypto.randomUUID()}@example.com`,
  });
  const savedUser = await helpers.saveUser(user);
  return {
    userId: savedUser.id,
    // wallet.userId / credit_card.userId FKs are onDelete: cascade, so
    // deleting the user cleans up everything created during the test.
    cleanup: () => helpers.deleteUser(savedUser.id),
  };
}

describe("transaction table: transaction_exactly_one_destination check constraint", () => {
  test("inserting a transaction with both walletId and cardId set fails at the DB layer", async () => {
    const { userId, cleanup } = await createUser("txn-check-both");
    try {
      const [createdWallet] = await db
        .insert(wallet)
        .values({
          id: crypto.randomUUID(),
          userId,
          name: "Checking",
          balance: 0,
          color: "#71717a",
          icon: "wallet",
        })
        .returning();
      const [createdCard] = await db
        .insert(creditCard)
        .values({
          id: crypto.randomUUID(),
          userId,
          name: "Card",
          balance: 0,
          color: "#71717a",
          icon: "wallet",
          statementCloseDay: 1,
          dueDay: 15,
        })
        .returning();

      let threw = false;
      try {
        await db.insert(transaction).values({
          id: crypto.randomUUID(),
          walletId: createdWallet?.id,
          cardId: createdCard?.id,
          categoryId: "system-food",
          userId,
          type: "expense",
          amount: 10,
          date: "2026-01-15",
          note: null,
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    } finally {
      await cleanup();
    }
  });

  test("inserting a transaction with neither walletId nor cardId set fails at the DB layer", async () => {
    const { userId, cleanup } = await createUser("txn-check-neither");
    try {
      let threw = false;
      try {
        await db.insert(transaction).values({
          id: crypto.randomUUID(),
          walletId: null,
          cardId: null,
          categoryId: "system-food",
          userId,
          type: "expense",
          amount: 10,
          date: "2026-01-15",
          note: null,
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    } finally {
      await cleanup();
    }
  });
});
