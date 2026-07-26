import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { app } from "../../../app/app";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";
import { creditCardPayment, transaction } from "../../../shared/db/schema";
import { computeStatementCycle } from "../domain/statement-cycle";

// Mirrors shared/auth/auth.test.ts's approach: a test-only Better Auth
// instance sharing the same DB + secret as the real `auth`, so its sessions
// are valid when checked through the real app's session-attaching middleware.
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
    // credit_card.userId FK is onDelete: cascade, so deleting the user
    // cleans up every card it created during the test.
    cleanup: () => helpers.deleteUser(savedUser.id),
  };
}

describe("credit-cards controller", () => {
  test("a signed-in user can create a credit card with all its fields", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-create");
    try {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 100.5,
          statementCloseDay: 5,
          dueDay: 20,
          color: "#22C55E",
          icon: "piggy-bank",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe("Rewards Card");
      expect(body.balance).toBe(100.5);
      expect(body.statementCloseDay).toBe(5);
      expect(body.dueDay).toBe(20);
      expect(body.color).toBe("#22c55e");
      expect(body.icon).toBe("piggy-bank");
    } finally {
      await cleanup();
    }
  });

  test("creating a credit card without changing the appearance defaults still succeeds", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-defaults");
    try {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 0,
          statementCloseDay: 5,
          dueDay: 20,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.color).toBe("#71717a");
      expect(body.icon).toBe("wallet");
    } finally {
      await cleanup();
    }
  });

  test("creating a credit card with an empty name is rejected with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-empty-name");
    try {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/credit-cards", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("creating a credit card with an icon outside the curated set is rejected", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-bad-icon");
    try {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 15,
          icon: "not-a-real-icon",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      await cleanup();
    }
  });

  test("creating a credit card with an invalid hex color is rejected", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-bad-color");
    try {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 15,
          color: "not-a-color",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      await cleanup();
    }
  });

  test("creating a credit card with a statementCloseDay or dueDay outside 1-31 is rejected", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-bad-day");
    try {
      const zeroRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 0,
          statementCloseDay: 0,
          dueDay: 15,
        }),
      });
      expect(zeroRes.status).toBe(400);

      const tooBigRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 32,
        }),
      });
      expect(tooBigRes.status).toBe(400);

      const nonIntegerRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Rewards Card",
          balance: 0,
          statementCloseDay: 1.5,
          dueDay: 15,
        }),
      });
      expect(nonIntegerRes.status).toBe(400);

      const listRes = await app.request("/credit-cards", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("creating a credit card without a statementCloseDay or dueDay is rejected", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-missing-day");
    try {
      const res = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Rewards Card", balance: 0, dueDay: 15 }),
      });

      expect(res.status).toBe(400);
    } finally {
      await cleanup();
    }
  });

  test("an unauthenticated request to a credit-cards endpoint is rejected with 401", async () => {
    const res = await app.request("/credit-cards");
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("listing credit cards returns only the requesting user's cards, not another user's", async () => {
    const userA = await createSignedInUser("cards-list-a");
    const userB = await createSignedInUser("cards-list-b");
    try {
      await app.request("/credit-cards", {
        method: "POST",
        headers: userA.headers,
        body: JSON.stringify({
          name: "A's card",
          balance: 10,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      await app.request("/credit-cards", {
        method: "POST",
        headers: userB.headers,
        body: JSON.stringify({
          name: "B's card",
          balance: 20,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });

      const res = await app.request("/credit-cards", {
        headers: userA.headers,
      });
      const body = await res.json();

      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("A's card");
    } finally {
      await userA.cleanup();
      await userB.cleanup();
    }
  });

  test("a user can rename a card they own, and its balance and statement fields are unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-rename");
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Old name",
          balance: 42,
          statementCloseDay: 5,
          dueDay: 20,
        }),
      });
      const created = await createRes.json();

      const renameRes = await app.request(`/credit-cards/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: "New name",
          statementCloseDay: 5,
          dueDay: 20,
        }),
      });
      const renamed = await renameRes.json();

      expect(renameRes.status).toBe(200);
      expect(renamed.name).toBe("New name");
      expect(renamed.balance).toBe(42);
      expect(renamed.statementCloseDay).toBe(5);
      expect(renamed.dueDay).toBe(20);
    } finally {
      await cleanup();
    }
  });

  test("a user can change a card's statement fields, and its balance is unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "cards-update-statement",
    );
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Card",
          balance: 10,
          statementCloseDay: 5,
          dueDay: 20,
        }),
      });
      const created = await createRes.json();

      const updateRes = await app.request(`/credit-cards/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: "Card",
          statementCloseDay: 10,
          dueDay: 25,
        }),
      });
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.statementCloseDay).toBe(10);
      expect(updated.dueDay).toBe(25);
      expect(updated.balance).toBe(10);
    } finally {
      await cleanup();
    }
  });

  test("updating a card with an invalid appearance or day field is rejected and the card is unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "cards-update-invalid",
    );
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Card",
          balance: 10,
          statementCloseDay: 5,
          dueDay: 20,
          color: "#22c55e",
          icon: "wallet",
        }),
      });
      const created = await createRes.json();

      const updateRes = await app.request(`/credit-cards/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: "Card",
          statementCloseDay: 99,
          dueDay: 20,
        }),
      });
      expect(updateRes.status).toBe(400);

      const listRes = await app.request("/credit-cards", { headers });
      const listBody = await listRes.json();
      expect(listBody[0].statementCloseDay).toBe(5);
    } finally {
      await cleanup();
    }
  });

  test("a user cannot update another user's credit card", async () => {
    const owner = await createSignedInUser("cards-update-owner");
    const attacker = await createSignedInUser("cards-update-attacker");
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          name: "Owner's card",
          balance: 5,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/credit-cards/${created.id}`, {
        method: "PATCH",
        headers: attacker.headers,
        body: JSON.stringify({
          name: "Hijacked",
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CREDIT_CARD_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("a user can delete a card they own after confirmation", async () => {
    const { headers, cleanup } = await createSignedInUser("cards-delete");
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "To delete",
          balance: 1,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      const created = await createRes.json();

      const deleteRes = await app.request(`/credit-cards/${created.id}`, {
        method: "DELETE",
        headers,
      });
      expect(deleteRes.status).toBe(204);

      const listRes = await app.request("/credit-cards", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("a user cannot delete another user's credit card", async () => {
    const owner = await createSignedInUser("cards-delete-owner");
    const attacker = await createSignedInUser("cards-delete-attacker");
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          name: "Owner's card",
          balance: 5,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/credit-cards/${created.id}`, {
        method: "DELETE",
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CREDIT_CARD_NOT_FOUND");

      const listRes = await app.request("/credit-cards", {
        headers: owner.headers,
      });
      const listBody = await listRes.json();
      expect(listBody).toHaveLength(1);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("deleting a credit card also deletes its charges", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "cards-delete-cascade",
    );
    try {
      const createRes = await app.request("/credit-cards", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Card",
          balance: 0,
          statementCloseDay: 1,
          dueDay: 15,
        }),
      });
      const created = await createRes.json();

      const chargeRes = await app.request(
        `/credit-cards/${created.id}/charges`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            amount: 25,
            categoryId: "system-food",
            date: "2026-01-15",
          }),
        },
      );
      const createdCharge = await chargeRes.json();

      const deleteRes = await app.request(`/credit-cards/${created.id}`, {
        method: "DELETE",
        headers,
      });
      expect(deleteRes.status).toBe(204);

      const remaining = await db.query.transaction.findFirst({
        where: eq(transaction.id, createdCharge.id),
      });
      expect(remaining).toBeUndefined();
    } finally {
      await cleanup();
    }
  });
});

describe("credit-cards controller: statement cycle", () => {
  async function createCardWithCycle(
    headers: Headers,
    statementCloseDay: number,
    dueDay: number,
  ) {
    const createRes = await app.request("/credit-cards", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Card",
        balance: 0,
        statementCloseDay,
        dueDay,
      }),
    });
    const created = await createRes.json();
    const today = new Date().toISOString().slice(0, 10);
    const cycle = computeStatementCycle(today, statementCloseDay, dueDay);
    return { card: created, cycle };
  }

  async function createCharge(
    headers: Headers,
    cardId: string,
    input: { amount: number; date: string; status: "pending" | "posted" },
  ) {
    const res = await app.request(`/credit-cards/${cardId}/charges`, {
      method: "POST",
      headers,
      body: JSON.stringify({ categoryId: "system-food", ...input }),
    });
    return res.json();
  }

  async function fetchCard(headers: Headers, cardId: string) {
    const res = await app.request("/credit-cards", { headers });
    const body = await res.json();
    return body.find((c: { id: string }) => c.id === cardId);
  }

  test("a posted charge within the closed cycle counts toward its statement total", async () => {
    const { headers, cleanup } = await createSignedInUser("stmt-posted-in");
    try {
      const { card, cycle } = await createCardWithCycle(headers, 5, 20);
      await createCharge(headers, card.id, {
        amount: 40,
        date: cycle.closedCycleEnd,
        status: "posted",
      });

      const found = await fetchCard(headers, card.id);
      expect(found.statement.total).toBe(40);
      expect(found.statement.closedCycleStart).toBe(cycle.closedCycleStart);
      expect(found.statement.closedCycleEnd).toBe(cycle.closedCycleEnd);
      expect(found.statement.dueDate).toBe(cycle.dueDate);
    } finally {
      await cleanup();
    }
  });

  test("a pending charge is excluded from the statement total until posted", async () => {
    const { headers, cleanup } = await createSignedInUser("stmt-pending");
    try {
      const { card, cycle } = await createCardWithCycle(headers, 5, 20);
      await createCharge(headers, card.id, {
        amount: 40,
        date: cycle.closedCycleEnd,
        status: "pending",
      });

      const found = await fetchCard(headers, card.id);
      expect(found.statement.total).toBe(0);
      // Balance still reflects every charge regardless of status.
      expect(found.balance).toBe(40);
    } finally {
      await cleanup();
    }
  });

  test("a posted charge dated in the still-open cycle is excluded from the closed cycle's total", async () => {
    const { headers, cleanup } = await createSignedInUser("stmt-open-cycle");
    try {
      const { card, cycle } = await createCardWithCycle(headers, 5, 20);
      await createCharge(headers, card.id, {
        amount: 40,
        date: cycle.openCycleStart,
        status: "posted",
      });

      const found = await fetchCard(headers, card.id);
      expect(found.statement.total).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("a charge posting later is reflected the next time the statement total is read", async () => {
    const { headers, cleanup } = await createSignedInUser("stmt-status-flip");
    try {
      const { card, cycle } = await createCardWithCycle(headers, 5, 20);
      const charge = await createCharge(headers, card.id, {
        amount: 40,
        date: cycle.closedCycleEnd,
        status: "pending",
      });

      const beforePost = await fetchCard(headers, card.id);
      expect(beforePost.statement.total).toBe(0);

      await app.request(`/transactions/${charge.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          cardId: card.id,
          amount: 40,
          categoryId: "system-food",
          date: cycle.closedCycleEnd,
          status: "posted",
        }),
      });

      const afterPost = await fetchCard(headers, card.id);
      expect(afterPost.statement.total).toBe(40);
    } finally {
      await cleanup();
    }
  });

  test("a closed cycle with no posted charges shows a statement total of zero", async () => {
    const { headers, cleanup } = await createSignedInUser("stmt-empty");
    try {
      const { card } = await createCardWithCycle(headers, 5, 20);

      const found = await fetchCard(headers, card.id);
      expect(found.statement.total).toBe(0);
    } finally {
      await cleanup();
    }
  });
});

describe("credit-cards controller: payments", () => {
  async function createCard(headers: Headers, balance = 100) {
    const res = await app.request("/credit-cards", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Card",
        balance,
        statementCloseDay: 5,
        dueDay: 20,
      }),
    });
    return res.json();
  }

  async function createWallet(headers: Headers, balance = 500) {
    const res = await app.request("/wallets", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Checking", balance }),
    });
    return res.json();
  }

  test("paying a card succeeds, decreasing both the card's and wallet's balance", async () => {
    const { headers, cleanup } = await createSignedInUser("pay-success");
    try {
      const card = await createCard(headers, 100);
      const walletCreated = await createWallet(headers, 500);

      const res = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: walletCreated.id,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.amount).toBe(40);
      expect(body.cardId).toBe(card.id);
      expect(body.walletId).toBe(walletCreated.id);

      const cards = await (
        await app.request("/credit-cards", { headers })
      ).json();
      expect(cards.find((c: { id: string }) => c.id === card.id).balance).toBe(
        60,
      );

      const wallets = await (await app.request("/wallets", { headers })).json();
      expect(
        wallets.find((w: { id: string }) => w.id === walletCreated.id).balance,
      ).toBe(460);
    } finally {
      await cleanup();
    }
  });

  test("paying a card owned by another user fails, no payment created, no balance changes", async () => {
    const owner = await createSignedInUser("pay-card-owner");
    const attacker = await createSignedInUser("pay-card-attacker");
    try {
      const card = await createCard(owner.headers, 100);
      const attackerWallet = await createWallet(attacker.headers, 500);

      const res = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers: attacker.headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: attackerWallet.id,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CREDIT_CARD_NOT_FOUND");

      const cards = await (
        await app.request("/credit-cards", { headers: owner.headers })
      ).json();
      expect(cards.find((c: { id: string }) => c.id === card.id).balance).toBe(
        100,
      );

      const wallets = await (
        await app.request("/wallets", { headers: attacker.headers })
      ).json();
      expect(
        wallets.find((w: { id: string }) => w.id === attackerWallet.id).balance,
      ).toBe(500);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("paying from a wallet owned by another user fails, no payment created, no balance changes", async () => {
    const owner = await createSignedInUser("pay-wallet-owner");
    const attacker = await createSignedInUser("pay-wallet-attacker");
    try {
      const card = await createCard(owner.headers, 100);
      const attackerWallet = await createWallet(attacker.headers, 500);

      const res = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: attackerWallet.id,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");

      const cards = await (
        await app.request("/credit-cards", { headers: owner.headers })
      ).json();
      expect(cards.find((c: { id: string }) => c.id === card.id).balance).toBe(
        100,
      );
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("paying with a non-positive amount fails, no payment created", async () => {
    const { headers, cleanup } = await createSignedInUser("pay-invalid-amount");
    try {
      const card = await createCard(headers, 100);
      const walletCreated = await createWallet(headers, 500);

      const res = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: 0,
          date: "2026-01-15",
          walletId: walletCreated.id,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const payments = await (
        await app.request(`/credit-cards/${card.id}/payments`, { headers })
      ).json();
      expect(payments).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("deleting a payment reverses both balance effects", async () => {
    const { headers, cleanup } = await createSignedInUser("pay-delete");
    try {
      const card = await createCard(headers, 100);
      const walletCreated = await createWallet(headers, 500);

      const createRes = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: walletCreated.id,
        }),
      });
      const payment = await createRes.json();

      const deleteRes = await app.request(
        `/credit-card-payments/${payment.id}`,
        { method: "DELETE", headers },
      );
      expect(deleteRes.status).toBe(204);

      const cards = await (
        await app.request("/credit-cards", { headers })
      ).json();
      expect(cards.find((c: { id: string }) => c.id === card.id).balance).toBe(
        100,
      );

      const wallets = await (await app.request("/wallets", { headers })).json();
      expect(
        wallets.find((w: { id: string }) => w.id === walletCreated.id).balance,
      ).toBe(500);
    } finally {
      await cleanup();
    }
  });

  test("deleting another user's payment fails, nothing removed, no balance changes", async () => {
    const owner = await createSignedInUser("pay-delete-owner");
    const attacker = await createSignedInUser("pay-delete-attacker");
    try {
      const card = await createCard(owner.headers, 100);
      const ownerWallet = await createWallet(owner.headers, 500);

      const createRes = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: ownerWallet.id,
        }),
      });
      const payment = await createRes.json();

      const res = await app.request(`/credit-card-payments/${payment.id}`, {
        method: "DELETE",
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CREDIT_CARD_PAYMENT_NOT_FOUND");

      const stillThere = await db.query.creditCardPayment.findFirst({
        where: eq(creditCardPayment.id, payment.id),
      });
      expect(stillThere).toBeDefined();
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("payment history is scoped to the requesting card/user", async () => {
    const { headers, cleanup } = await createSignedInUser("pay-history-scope");
    try {
      const card = await createCard(headers, 100);
      const walletCreated = await createWallet(headers, 500);

      await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: walletCreated.id,
        }),
      });

      const res = await app.request(`/credit-cards/${card.id}/payments`, {
        headers,
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].amount).toBe(40);
    } finally {
      await cleanup();
    }
  });

  test("requesting another user's card payment history fails", async () => {
    const owner = await createSignedInUser("pay-history-owner");
    const attacker = await createSignedInUser("pay-history-attacker");
    try {
      const card = await createCard(owner.headers, 100);

      const res = await app.request(`/credit-cards/${card.id}/payments`, {
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CREDIT_CARD_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("deleting a credit card also deletes its payments", async () => {
    const { headers, cleanup } = await createSignedInUser("pay-card-cascade");
    try {
      const card = await createCard(headers, 100);
      const walletCreated = await createWallet(headers, 500);

      const createRes = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: walletCreated.id,
        }),
      });
      const payment = await createRes.json();

      await app.request(`/credit-cards/${card.id}`, {
        method: "DELETE",
        headers,
      });

      const remaining = await db.query.creditCardPayment.findFirst({
        where: eq(creditCardPayment.id, payment.id),
      });
      expect(remaining).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  test("deleting a wallet also deletes credit card payments sourced from it", async () => {
    const { headers, cleanup } = await createSignedInUser("pay-wallet-cascade");
    try {
      const card = await createCard(headers, 100);
      const walletCreated = await createWallet(headers, 500);

      const createRes = await app.request(`/credit-cards/${card.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: 40,
          date: "2026-01-15",
          walletId: walletCreated.id,
        }),
      });
      const payment = await createRes.json();

      await app.request(`/wallets/${walletCreated.id}`, {
        method: "DELETE",
        headers,
      });

      const remaining = await db.query.creditCardPayment.findFirst({
        where: eq(creditCardPayment.id, payment.id),
      });
      expect(remaining).toBeUndefined();
    } finally {
      await cleanup();
    }
  });
});
