import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { app } from "../../../app/app";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";

const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [testUtils()],
});

async function createSignedInUser(emailPrefix: string) {
  const ctx = await testAuth.$context;
  const { test: helpers } = ctx;
  const user = helpers.createUser({
    email: `${emailPrefix}-${crypto.randomUUID()}@example.com`,
  });
  const savedUser = await helpers.saveUser(user);
  const headers = await helpers.getAuthHeaders({ userId: savedUser.id });
  headers.set("Content-Type", "application/json");
  return {
    userId: savedUser.id,
    headers,
    // wallet.userId / transaction.userId FKs are onDelete: cascade, so
    // deleting the user cleans up every wallet/transaction it created.
    cleanup: () => helpers.deleteUser(savedUser.id),
  };
}

async function createWallet(
  headers: Headers,
  input: { name: string; balance: number },
) {
  const res = await app.request("/wallets", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  return res.json();
}

describe("transactions controller", () => {
  test("logging an income transaction increases the wallet's balance", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-income");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 100,
      });

      const res = await app.request(`/wallets/${wallet.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "income",
          amount: 50,
          categoryId: "system-salary",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.type).toBe("income");
      expect(body.amount).toBe(50);

      const walletRes = await app.request("/wallets", { headers });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(150);
    } finally {
      await cleanup();
    }
  });

  test("logging an expense transaction decreases the wallet's balance", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-expense");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 100,
      });

      const res = await app.request(`/wallets/${wallet.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "expense",
          amount: 30,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.type).toBe("expense");

      const walletRes = await app.request("/wallets", { headers });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(70);
    } finally {
      await cleanup();
    }
  });

  test("logging a transaction against another user's wallet fails and changes nothing", async () => {
    const owner = await createSignedInUser("tx-cross-owner");
    const attacker = await createSignedInUser("tx-cross-attacker");
    try {
      const wallet = await createWallet(owner.headers, {
        name: "Owner's wallet",
        balance: 100,
      });

      const res = await app.request(`/wallets/${wallet.id}/transactions`, {
        method: "POST",
        headers: attacker.headers,
        body: JSON.stringify({
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");

      const walletRes = await app.request("/wallets", {
        headers: owner.headers,
      });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(100);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("logging a transaction with a mismatched category type is rejected", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-mismatch");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 100,
      });

      const res = await app.request(`/wallets/${wallet.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "income",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const walletRes = await app.request("/wallets", { headers });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(100);
    } finally {
      await cleanup();
    }
  });

  test("logging a transaction with a non-positive amount is rejected", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-non-positive");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 100,
      });

      const res = await app.request(`/wallets/${wallet.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "expense",
          amount: 0,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      await cleanup();
    }
  });

  test("listing a wallet's transactions is scoped to that wallet and ordered most recent first", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-list");
    try {
      const walletA = await createWallet(headers, {
        name: "Wallet A",
        balance: 0,
      });
      const walletB = await createWallet(headers, {
        name: "Wallet B",
        balance: 0,
      });

      await app.request(`/wallets/${walletA.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        }),
      });
      await app.request(`/wallets/${walletA.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-10",
        }),
      });
      await app.request(`/wallets/${walletB.id}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "expense",
          amount: 999,
          categoryId: "system-food",
          date: "2026-01-05",
        }),
      });

      const res = await app.request(`/wallets/${walletA.id}/transactions`, {
        headers,
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body[0].date).toBe("2026-01-10");
      expect(body[1].date).toBe("2026-01-01");
    } finally {
      await cleanup();
    }
  });

  test("requesting another user's wallet transaction list fails", async () => {
    const owner = await createSignedInUser("tx-list-cross-owner");
    const attacker = await createSignedInUser("tx-list-cross-attacker");
    try {
      const wallet = await createWallet(owner.headers, {
        name: "Owner's wallet",
        balance: 0,
      });

      const res = await app.request(`/wallets/${wallet.id}/transactions`, {
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("editing a transaction's amount adjusts the wallet balance by the difference", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-edit-amount");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 100,
      });
      const createRes = await app.request(
        `/wallets/${wallet.id}/transactions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "expense",
            amount: 20,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      const updateRes = await app.request(`/transactions/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          walletId: wallet.id,
          type: "expense",
          amount: 50,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.amount).toBe(50);

      const walletRes = await app.request("/wallets", { headers });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(50);
    } finally {
      await cleanup();
    }
  });

  test("moving a transaction to a different owned wallet moves its balance effect", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-move");
    try {
      const walletA = await createWallet(headers, {
        name: "Wallet A",
        balance: 100,
      });
      const walletB = await createWallet(headers, {
        name: "Wallet B",
        balance: 100,
      });
      const createRes = await app.request(
        `/wallets/${walletA.id}/transactions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "expense",
            amount: 20,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      const updateRes = await app.request(`/transactions/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          walletId: walletB.id,
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      expect(updateRes.status).toBe(200);

      const walletRes = await app.request("/wallets", { headers });
      const wallets: { id: string; balance: number }[] = await walletRes.json();
      const refreshedA = wallets.find((w) => w.id === walletA.id);
      const refreshedB = wallets.find((w) => w.id === walletB.id);
      expect(refreshedA?.balance).toBe(100);
      expect(refreshedB?.balance).toBe(80);
    } finally {
      await cleanup();
    }
  });

  test("editing another user's transaction fails and nothing changes", async () => {
    const owner = await createSignedInUser("tx-edit-cross-owner");
    const attacker = await createSignedInUser("tx-edit-cross-attacker");
    try {
      const wallet = await createWallet(owner.headers, {
        name: "Owner's wallet",
        balance: 100,
      });
      const createRes = await app.request(
        `/wallets/${wallet.id}/transactions`,
        {
          method: "POST",
          headers: owner.headers,
          body: JSON.stringify({
            type: "expense",
            amount: 20,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      const res = await app.request(`/transactions/${created.id}`, {
        method: "PATCH",
        headers: attacker.headers,
        body: JSON.stringify({
          walletId: wallet.id,
          type: "expense",
          amount: 999,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("TRANSACTION_NOT_FOUND");

      const walletRes = await app.request("/wallets", {
        headers: owner.headers,
      });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(80);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("moving a transaction to a wallet the user doesn't own fails and neither balance changes", async () => {
    const owner = await createSignedInUser("tx-move-cross-owner");
    const attacker = await createSignedInUser("tx-move-cross-attacker");
    try {
      const ownerWallet = await createWallet(owner.headers, {
        name: "Owner's wallet",
        balance: 100,
      });
      const attackerWallet = await createWallet(attacker.headers, {
        name: "Attacker's wallet",
        balance: 100,
      });
      const createRes = await app.request(
        `/wallets/${ownerWallet.id}/transactions`,
        {
          method: "POST",
          headers: owner.headers,
          body: JSON.stringify({
            type: "expense",
            amount: 20,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      const res = await app.request(`/transactions/${created.id}`, {
        method: "PATCH",
        headers: owner.headers,
        body: JSON.stringify({
          walletId: attackerWallet.id,
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-15",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");

      const ownerWalletRes = await app.request("/wallets", {
        headers: owner.headers,
      });
      const ownerWallets = await ownerWalletRes.json();
      expect(ownerWallets[0].balance).toBe(80);

      const attackerWalletRes = await app.request("/wallets", {
        headers: attacker.headers,
      });
      const attackerWallets = await attackerWalletRes.json();
      expect(attackerWallets[0].balance).toBe(100);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("deleting a transaction reverses its balance effect", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-delete");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 100,
      });
      const createRes = await app.request(
        `/wallets/${wallet.id}/transactions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "expense",
            amount: 30,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      const deleteRes = await app.request(`/transactions/${created.id}`, {
        method: "DELETE",
        headers,
      });
      expect(deleteRes.status).toBe(204);

      const walletRes = await app.request("/wallets", { headers });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(100);

      const listRes = await app.request(`/wallets/${wallet.id}/transactions`, {
        headers,
      });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("deleting another user's transaction fails", async () => {
    const owner = await createSignedInUser("tx-delete-cross-owner");
    const attacker = await createSignedInUser("tx-delete-cross-attacker");
    try {
      const wallet = await createWallet(owner.headers, {
        name: "Owner's wallet",
        balance: 100,
      });
      const createRes = await app.request(
        `/wallets/${wallet.id}/transactions`,
        {
          method: "POST",
          headers: owner.headers,
          body: JSON.stringify({
            type: "expense",
            amount: 30,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      const res = await app.request(`/transactions/${created.id}`, {
        method: "DELETE",
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("TRANSACTION_NOT_FOUND");

      const walletRes = await app.request("/wallets", {
        headers: owner.headers,
      });
      const wallets = await walletRes.json();
      expect(wallets[0].balance).toBe(70);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("two concurrent edits against the same wallet don't corrupt its balance", async () => {
    const { headers, cleanup } = await createSignedInUser("tx-concurrent");
    try {
      const wallet = await createWallet(headers, {
        name: "Checking",
        balance: 1000,
      });
      const createRes = await app.request(
        `/wallets/${wallet.id}/transactions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "expense",
            amount: 100,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const created = await createRes.json();

      // Both requests race to edit the same transaction's amount — the row
      // lock in TransactionsRepository.updateWithBalanceUpdate must
      // serialize them so the final wallet balance always matches whichever
      // amount actually won, never a corrupted in-between value.
      const [resA, resB] = await Promise.all([
        app.request(`/transactions/${created.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            walletId: wallet.id,
            type: "expense",
            amount: 150,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        }),
        app.request(`/transactions/${created.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            walletId: wallet.id,
            type: "expense",
            amount: 200,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        }),
      ]);
      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const listRes = await app.request(`/wallets/${wallet.id}/transactions`, {
        headers,
      });
      const [finalTransaction] = await listRes.json();

      const walletRes = await app.request("/wallets", { headers });
      const wallets = await walletRes.json();

      expect(wallets[0].balance).toBe(1000 - finalTransaction.amount);
    } finally {
      await cleanup();
    }
  });

  describe("GET /transactions (all wallets)", () => {
    async function createTransactionFor(
      headers: Headers,
      walletId: string,
      input: {
        type: "income" | "expense";
        amount: number;
        categoryId: string;
        date: string;
        note?: string;
      },
    ) {
      const res = await app.request(`/wallets/${walletId}/transactions`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
      return res.json();
    }

    test("only includes the signed-in user's own transactions across every wallet they own", async () => {
      const owner = await createSignedInUser("tx-all-owner");
      const other = await createSignedInUser("tx-all-other");
      try {
        const walletA = await createWallet(owner.headers, {
          name: "Wallet A",
          balance: 0,
        });
        const walletB = await createWallet(owner.headers, {
          name: "Wallet B",
          balance: 0,
        });
        const otherWallet = await createWallet(other.headers, {
          name: "Other's wallet",
          balance: 0,
        });

        await createTransactionFor(owner.headers, walletA.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(owner.headers, walletB.id, {
          type: "income",
          amount: 20,
          categoryId: "system-salary",
          date: "2026-01-02",
        });
        await createTransactionFor(other.headers, otherWallet.id, {
          type: "expense",
          amount: 999,
          categoryId: "system-food",
          date: "2026-01-03",
        });

        const res = await app.request("/transactions", {
          headers: owner.headers,
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(2);
        expect(body.every((t: { amount: number }) => t.amount !== 999)).toBe(
          true,
        );
        // Most recent first.
        expect(body[0].amount).toBe(20);
        expect(body[1].amount).toBe(10);
        // Each row carries its wallet's appearance.
        expect(body[0].wallet.id).toBe(walletB.id);
        expect(body[0].wallet.name).toBe("Wallet B");
      } finally {
        await owner.cleanup();
        await other.cleanup();
      }
    });

    test("filtering by wallet narrows the list", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-wallet");
      try {
        const walletA = await createWallet(headers, {
          name: "Wallet A",
          balance: 0,
        });
        const walletB = await createWallet(headers, {
          name: "Wallet B",
          balance: 0,
        });
        await createTransactionFor(headers, walletA.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(headers, walletB.id, {
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-01",
        });

        const res = await app.request(`/transactions?walletId=${walletA.id}`, {
          headers,
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].walletId).toBe(walletA.id);
      } finally {
        await cleanup();
      }
    });

    test("filtering by category narrows the list", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-category");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "income",
          amount: 20,
          categoryId: "system-salary",
          date: "2026-01-01",
        });

        const res = await app.request(
          "/transactions?categoryId=system-salary",
          { headers },
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].categoryId).toBe("system-salary");
      } finally {
        await cleanup();
      }
    });

    test("filtering by type narrows the list", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-type");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "income",
          amount: 20,
          categoryId: "system-salary",
          date: "2026-01-01",
        });

        const res = await app.request("/transactions?type=income", {
          headers,
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].type).toBe("income");
      } finally {
        await cleanup();
      }
    });

    test("filtering by date range narrows the list", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-daterange");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-15",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 30,
          categoryId: "system-food",
          date: "2026-01-31",
        });

        const res = await app.request(
          "/transactions?dateFrom=2026-01-10&dateTo=2026-01-20",
          { headers },
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].date).toBe("2026-01-15");
      } finally {
        await cleanup();
      }
    });

    test("filtering by note search narrows the list, case-insensitively", async () => {
      const { headers, cleanup } =
        await createSignedInUser("tx-all-notesearch");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
          note: "Weekly Groceries run",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-02",
          note: "Coffee",
        });

        const res = await app.request("/transactions?noteSearch=groceries", {
          headers,
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].note).toBe("Weekly Groceries run");
      } finally {
        await cleanup();
      }
    });

    test("combining filters applies all of them", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-combo");
      try {
        const walletA = await createWallet(headers, {
          name: "Wallet A",
          balance: 0,
        });
        const walletB = await createWallet(headers, {
          name: "Wallet B",
          balance: 0,
        });
        await createTransactionFor(headers, walletA.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
          note: "Groceries",
        });
        // Same wallet + note but wrong type — should be excluded.
        await createTransactionFor(headers, walletA.id, {
          type: "income",
          amount: 999,
          categoryId: "system-salary",
          date: "2026-01-01",
          note: "Groceries refund",
        });
        // Matches type/category/note but wrong wallet — should be excluded.
        await createTransactionFor(headers, walletB.id, {
          type: "expense",
          amount: 30,
          categoryId: "system-food",
          date: "2026-01-01",
          note: "Groceries",
        });

        const res = await app.request(
          `/transactions?walletId=${walletA.id}&categoryId=system-food&type=expense&noteSearch=groceries`,
          { headers },
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].amount).toBe(10);
      } finally {
        await cleanup();
      }
    });

    test("limit caps the number of results to the N most recent", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-limit");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-02",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 30,
          categoryId: "system-food",
          date: "2026-01-03",
        });

        const res = await app.request("/transactions?limit=2", { headers });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(2);
        expect(body[0].amount).toBe(30);
        expect(body[1].amount).toBe(20);
      } finally {
        await cleanup();
      }
    });

    test("limit combined with existing filters still applies both correctly", async () => {
      const { headers, cleanup } =
        await createSignedInUser("tx-all-limit-combo");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 20,
          categoryId: "system-food",
          date: "2026-01-02",
        });
        // Income — excluded by the type filter regardless of limit.
        await createTransactionFor(headers, wallet.id, {
          type: "income",
          amount: 999,
          categoryId: "system-salary",
          date: "2026-01-03",
        });

        const res = await app.request("/transactions?type=expense&limit=1", {
          headers,
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].amount).toBe(20);
      } finally {
        await cleanup();
      }
    });

    test("a filter combination matching nothing returns an empty list, not an error", async () => {
      const { headers, cleanup } = await createSignedInUser("tx-all-nomatch");
      try {
        const wallet = await createWallet(headers, {
          name: "Checking",
          balance: 0,
        });
        await createTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });

        const res = await app.request(
          "/transactions?noteSearch=nothing-matches-this",
          { headers },
        );
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
      } finally {
        await cleanup();
      }
    });

    test("a filter referencing a wallet the user doesn't own yields an empty list, not an error", async () => {
      const owner = await createSignedInUser("tx-all-foreign-owner");
      const attacker = await createSignedInUser("tx-all-foreign-attacker");
      try {
        const wallet = await createWallet(owner.headers, {
          name: "Owner's wallet",
          balance: 0,
        });
        await createTransactionFor(owner.headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-01",
        });

        const res = await app.request(`/transactions?walletId=${wallet.id}`, {
          headers: attacker.headers,
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual([]);
      } finally {
        await owner.cleanup();
        await attacker.cleanup();
      }
    });
  });
});
