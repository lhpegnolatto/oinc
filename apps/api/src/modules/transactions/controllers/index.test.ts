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

  describe("credit card charges", () => {
    async function createWalletTransactionFor(
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

    async function createCard(
      headers: Headers,
      overrides: Partial<{
        name: string;
        balance: number;
        statementCloseDay: number;
        dueDay: number;
      }> = {},
    ) {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Card",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 15,
          ...overrides,
        }),
      });
      return res.json();
    }

    async function getCard(headers: Headers, cardId: string) {
      const res = await app.request("/credit-cards", { headers });
      const cards = await res.json();
      // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
      return cards.find((c: any) => c.id === cardId);
    }

    test("logging a charge increases the card's balance by the amount", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-increase-balance",
      );
      try {
        const card = await createCard(headers, { balance: 100 });

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 25,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.amount).toBe(25);
        expect(body.cardId).toBe(card.id);
        expect(body.walletId).toBeNull();

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(125);
      } finally {
        await cleanup();
      }
    });

    test("logging a charge without a status defaults to posted; explicit pending persists and still moves the balance", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-status-default",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const defaultRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 10,
              categoryId: "system-food",
              date: "2026-01-15",
            }),
          },
        );
        const defaultBody = await defaultRes.json();
        expect(defaultBody.status).toBe("posted");

        const pendingRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 15,
              categoryId: "system-food",
              date: "2026-01-15",
              status: "pending",
            }),
          },
        );
        const pendingBody = await pendingRes.json();
        expect(pendingBody.status).toBe("pending");

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(25);
      } finally {
        await cleanup();
      }
    });

    test("logging a charge against another user's card fails, no charge is created, and no card balance changes", async () => {
      const owner = await createSignedInUser("charges-cross-user-owner");
      const attacker = await createSignedInUser("charges-cross-user-attacker");
      try {
        const card = await createCard(owner.headers, { balance: 50 });

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers: attacker.headers,
          body: JSON.stringify({
            amount: 10,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error.code).toBe("CREDIT_CARD_NOT_FOUND");

        const unchangedCard = await getCard(owner.headers, card.id);
        expect(unchangedCard.balance).toBe(50);
      } finally {
        await owner.cleanup();
        await attacker.cleanup();
      }
    });

    test("logging a charge with an income-type category is rejected", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-income-category",
      );
      try {
        const card = await createCard(headers);

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 10,
            categoryId: "system-salary",
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

    test("logging a charge with a non-positive amount is rejected", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-non-positive-amount",
      );
      try {
        const card = await createCard(headers);

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 0,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });

        expect(res.status).toBe(400);
      } finally {
        await cleanup();
      }
    });

    test("editing a charge's amount adjusts the card's balance correctly", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-edit-amount",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const chargeRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 10,
              categoryId: "system-food",
              date: "2026-01-15",
            }),
          },
        );
        const charge = await chargeRes.json();

        const updateRes = await app.request(`/transactions/${charge.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            cardId: card.id,
            amount: 40,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });
        expect(updateRes.status).toBe(200);

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(40);
      } finally {
        await cleanup();
      }
    });

    test("moving a charge to a different owned card moves its balance effect", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-move-owned-card",
      );
      try {
        const cardA = await createCard(headers, { balance: 0, name: "A" });
        const cardB = await createCard(headers, { balance: 0, name: "B" });

        const chargeRes = await app.request(
          `/credit-cards/${cardA.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 20,
              categoryId: "system-food",
              date: "2026-01-15",
            }),
          },
        );
        const charge = await chargeRes.json();

        const updateRes = await app.request(`/transactions/${charge.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            cardId: cardB.id,
            amount: 20,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });
        expect(updateRes.status).toBe(200);

        const updatedCardA = await getCard(headers, cardA.id);
        const updatedCardB = await getCard(headers, cardB.id);
        expect(updatedCardA.balance).toBe(0);
        expect(updatedCardB.balance).toBe(20);
      } finally {
        await cleanup();
      }
    });

    test("moving a charge to a card the user doesn't own fails, and neither card's balance changes", async () => {
      const owner = await createSignedInUser("charges-move-owner");
      const attacker = await createSignedInUser("charges-move-attacker");
      try {
        const ownerCard = await createCard(owner.headers, { balance: 0 });
        const attackerCard = await createCard(attacker.headers, {
          balance: 0,
        });

        const chargeRes = await app.request(
          `/credit-cards/${ownerCard.id}/charges`,
          {
            method: "POST",
            headers: owner.headers,
            body: JSON.stringify({
              amount: 20,
              categoryId: "system-food",
              date: "2026-01-15",
            }),
          },
        );
        const charge = await chargeRes.json();

        const updateRes = await app.request(`/transactions/${charge.id}`, {
          method: "PATCH",
          headers: owner.headers,
          body: JSON.stringify({
            cardId: attackerCard.id,
            amount: 20,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });
        const updateBody = await updateRes.json();

        expect(updateRes.status).toBe(404);
        expect(updateBody.error.code).toBe("CREDIT_CARD_NOT_FOUND");

        const unchangedOwnerCard = await getCard(owner.headers, ownerCard.id);
        const unchangedAttackerCard = await getCard(
          attacker.headers,
          attackerCard.id,
        );
        expect(unchangedOwnerCard.balance).toBe(20);
        expect(unchangedAttackerCard.balance).toBe(0);
      } finally {
        await owner.cleanup();
        await attacker.cleanup();
      }
    });

    test("deleting a charge reverses its balance effect", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-delete-reverses",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const chargeRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 30,
              categoryId: "system-food",
              date: "2026-01-15",
            }),
          },
        );
        const charge = await chargeRes.json();

        const deleteRes = await app.request(`/transactions/${charge.id}`, {
          method: "DELETE",
          headers,
        });
        expect(deleteRes.status).toBe(204);

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(0);
      } finally {
        await cleanup();
      }
    });

    test("the all-wallets GET /transactions list never includes card charges, even when filters are applied", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "charges-excluded-from-all-wallets",
      );
      try {
        const walletRes = await app.request("/wallets", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: "Checking", balance: 0 }),
        });
        const wallet = await walletRes.json();
        const card = await createCard(headers, { balance: 0 });

        await createWalletTransactionFor(headers, wallet.id, {
          type: "expense",
          amount: 10,
          categoryId: "system-food",
          date: "2026-01-15",
        });
        await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 10,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        });

        const unfiltered = await app.request("/transactions", { headers });
        const unfilteredBody = await unfiltered.json();
        expect(unfilteredBody).toHaveLength(1);
        expect(unfilteredBody[0].walletId).toBe(wallet.id);

        const filtered = await app.request(
          "/transactions?type=expense&categoryId=system-food",
          { headers },
        );
        const filteredBody = await filtered.json();
        expect(filteredBody).toHaveLength(1);
        expect(filteredBody[0].walletId).toBe(wallet.id);
      } finally {
        await cleanup();
      }
    });
  });

  describe("installment plans", () => {
    async function createCard(
      headers: Headers,
      overrides: Partial<{
        name: string;
        balance: number;
        statementCloseDay: number;
        dueDay: number;
      }> = {},
    ) {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Card",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 15,
          ...overrides,
        }),
      });
      return res.json();
    }

    async function getCard(headers: Headers, cardId: string) {
      const res = await app.request("/credit-cards", { headers });
      const cards = await res.json();
      // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
      return cards.find((c: any) => c.id === cardId);
    }

    async function getCharges(headers: Headers, cardId: string) {
      const res = await app.request(`/credit-cards/${cardId}/charges`, {
        headers,
      });
      return res.json();
    }

    test("splitting a charge into installments creates `count` charges dated one per month, sharing an installmentPlanId, and the card's balance increases by the full total", async () => {
      const { headers, cleanup } =
        await createSignedInUser("installments-basic");
      try {
        const card = await createCard(headers, { balance: 0 });

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 300,
            categoryId: "system-food",
            date: "2026-01-15",
            count: 3,
          }),
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(3);
        const planId = body[0].installmentPlanId;
        expect(planId).not.toBeNull();
        // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
        expect(body.every((c: any) => c.installmentPlanId === planId)).toBe(
          true,
        );
        // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
        expect(body.map((c: any) => c.installmentNumber)).toEqual([1, 2, 3]);
        expect(
          // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
          body.every((c: any) => c.installmentCount === 3),
        ).toBe(true);
        // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
        expect(body.map((c: any) => c.date)).toEqual([
          "2026-01-15",
          "2026-02-15",
          "2026-03-15",
        ]);

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(300);
      } finally {
        await cleanup();
      }
    });

    test("installment amounts sum exactly to the total when it doesn't divide evenly", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "installments-remainder",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 100,
            categoryId: "system-food",
            date: "2026-01-15",
            count: 3,
          }),
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body[0].amount).toBe(33.33);
        expect(body[1].amount).toBe(33.33);
        expect(body[2].amount).toBe(33.34);

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(100);
      } finally {
        await cleanup();
      }
    });

    test("a count of 1 or omitted creates a single non-installment charge with no installmentPlanId", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "installments-count-one",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const omittedRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 10,
              categoryId: "system-food",
              date: "2026-01-15",
            }),
          },
        );
        const omittedBody = await omittedRes.json();
        expect(omittedRes.status).toBe(201);
        expect(Array.isArray(omittedBody)).toBe(false);
        expect(omittedBody.installmentPlanId).toBeNull();

        const explicitRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 10,
              categoryId: "system-food",
              date: "2026-01-15",
              count: 1,
            }),
          },
        );
        const explicitBody = await explicitRes.json();
        expect(explicitRes.status).toBe(201);
        expect(Array.isArray(explicitBody)).toBe(false);
        expect(explicitBody.installmentPlanId).toBeNull();
      } finally {
        await cleanup();
      }
    });

    test("splitting a charge against another user's card fails, no charges are created, and no card balance changes", async () => {
      const owner = await createSignedInUser("installments-cross-owner");
      const attacker = await createSignedInUser("installments-cross-attacker");
      try {
        const card = await createCard(owner.headers, { balance: 50 });

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers: attacker.headers,
          body: JSON.stringify({
            amount: 90,
            categoryId: "system-food",
            date: "2026-01-15",
            count: 3,
          }),
        });
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error.code).toBe("CREDIT_CARD_NOT_FOUND");

        const unchangedCard = await getCard(owner.headers, card.id);
        expect(unchangedCard.balance).toBe(50);

        const charges = await getCharges(owner.headers, card.id);
        expect(charges).toHaveLength(0);
      } finally {
        await owner.cleanup();
        await attacker.cleanup();
      }
    });

    test("splitting a charge with a non-expense category fails, no charges are created", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "installments-bad-category",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const res = await app.request(`/credit-cards/${card.id}/charges`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 90,
            categoryId: "system-salary",
            date: "2026-01-15",
            count: 3,
          }),
        });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error.code).toBe("VALIDATION_ERROR");

        const charges = await getCharges(headers, card.id);
        expect(charges).toHaveLength(0);

        const unchangedCard = await getCard(headers, card.id);
        expect(unchangedCard.balance).toBe(0);
      } finally {
        await cleanup();
      }
    });

    test("splitting a charge with a non-positive total or an invalid count fails, no charges are created", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "installments-invalid-input",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const nonPositiveRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 0,
              categoryId: "system-food",
              date: "2026-01-15",
              count: 3,
            }),
          },
        );
        expect(nonPositiveRes.status).toBe(400);

        const invalidCountRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 90,
              categoryId: "system-food",
              date: "2026-01-15",
              count: 0,
            }),
          },
        );
        expect(invalidCountRes.status).toBe(400);

        const charges = await getCharges(headers, card.id);
        expect(charges).toHaveLength(0);
      } finally {
        await cleanup();
      }
    });

    test("deleting an installment and its remaining siblings removes them and reverses their balance effect, leaving earlier installments untouched", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "installments-delete-remaining",
      );
      try {
        const card = await createCard(headers, { balance: 0 });

        const createRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 300,
              categoryId: "system-food",
              date: "2026-01-15",
              count: 3,
            }),
          },
        );
        const charges = await createRes.json();
        const [first, second] = charges;

        const deleteRes = await app.request(
          `/transactions/${second.id}/remaining-installments`,
          { method: "DELETE", headers },
        );
        expect(deleteRes.status).toBe(204);

        const remaining = await getCharges(headers, card.id);
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe(first.id);

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(first.amount);
      } finally {
        await cleanup();
      }
    });

    test("deleting another user's installment plan fails, nothing removed, no balance changes", async () => {
      const owner = await createSignedInUser("installments-delete-cross-owner");
      const attacker = await createSignedInUser(
        "installments-delete-cross-attacker",
      );
      try {
        const card = await createCard(owner.headers, { balance: 0 });
        const createRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers: owner.headers,
            body: JSON.stringify({
              amount: 200,
              categoryId: "system-food",
              date: "2026-01-15",
              count: 2,
            }),
          },
        );
        const charges = await createRes.json();

        const res = await app.request(
          `/transactions/${charges[0].id}/remaining-installments`,
          { method: "DELETE", headers: attacker.headers },
        );
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error.code).toBe("TRANSACTION_NOT_FOUND");

        const remaining = await getCharges(owner.headers, card.id);
        expect(remaining).toHaveLength(2);

        const unchangedCard = await getCard(owner.headers, card.id);
        expect(unchangedCard.balance).toBe(200);
      } finally {
        await owner.cleanup();
        await attacker.cleanup();
      }
    });

    test("the existing single-charge DELETE /transactions/:id still deletes only that one row when it belongs to an installment plan", async () => {
      const { headers, cleanup } = await createSignedInUser(
        "installments-single-delete",
      );
      try {
        const card = await createCard(headers, { balance: 0 });
        const createRes = await app.request(
          `/credit-cards/${card.id}/charges`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              amount: 300,
              categoryId: "system-food",
              date: "2026-01-15",
              count: 3,
            }),
          },
        );
        const charges = await createRes.json();

        const deleteRes = await app.request(`/transactions/${charges[1].id}`, {
          method: "DELETE",
          headers,
        });
        expect(deleteRes.status).toBe(204);

        const remaining = await getCharges(headers, card.id);
        expect(remaining).toHaveLength(2);
        // biome-ignore lint/suspicious/noExplicitAny: test helper over a JSON response
        expect(remaining.map((c: any) => c.id).sort()).toEqual(
          [charges[0].id, charges[2].id].sort(),
        );

        const updatedCard = await getCard(headers, card.id);
        expect(updatedCard.balance).toBe(200);
      } finally {
        await cleanup();
      }
    });
  });
});
