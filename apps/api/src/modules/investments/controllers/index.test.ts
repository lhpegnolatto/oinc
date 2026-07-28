import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { app } from "../../../app/app";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";

// Mirrors wallets/controllers/index.test.ts's approach: a test-only Better
// Auth instance sharing the same DB + secret as the real `auth`, so its
// sessions are valid when checked through the real app's session-attaching
// middleware.
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
    // investment.userId FK is onDelete: cascade, so deleting the user cleans
    // up every holding it created during the test — no separate cleanup.
    cleanup: () => helpers.deleteUser(savedUser.id),
  };
}

describe("investments controller", () => {
  test("a signed-in user can create a holding with a name and current value only, leaving quantity/costBasis unset", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-create-minimal",
    );
    try {
      const res = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "S&P 500 ETF", currentValue: 5000 }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe("S&P 500 ETF");
      expect(body.currentValue).toBe(5000);
      expect(body.quantity).toBeNull();
      expect(body.costBasis).toBeNull();
    } finally {
      await cleanup();
    }
  });

  test("a signed-in user can create a holding with name, currentValue, quantity, and costBasis all set", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-create-full",
    );
    try {
      const res = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Bitcoin",
          currentValue: 4200.5,
          quantity: 0.1,
          costBasis: 3000,
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe("Bitcoin");
      expect(body.currentValue).toBe(4200.5);
      expect(body.quantity).toBe(0.1);
      expect(body.costBasis).toBe(3000);
    } finally {
      await cleanup();
    }
  });

  test("creating a holding with an empty name is rejected with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-empty-name",
    );
    try {
      const res = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "", currentValue: 100 }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/investments", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("creating a holding with no currentValue is rejected with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-no-current-value",
    );
    try {
      const res = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Bitcoin" }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/investments", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("creating a holding never changes any wallet's balance", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-create-wallet-untouched",
    );
    try {
      const walletRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Checking", balance: 1000 }),
      });
      const wallet = await walletRes.json();

      await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Bitcoin", currentValue: 500 }),
      });

      const listRes = await app.request("/wallets", { headers });
      const listBody = await listRes.json();
      expect(listBody).toHaveLength(1);
      expect(listBody[0].id).toBe(wallet.id);
      expect(listBody[0].balance).toBe(1000);
    } finally {
      await cleanup();
    }
  });

  test("an unauthenticated request to any investments endpoint is rejected with 401", async () => {
    const res = await app.request("/investments");
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("listing holdings returns only the requesting user's holdings, not another user's", async () => {
    const userA = await createSignedInUser("investments-list-a");
    const userB = await createSignedInUser("investments-list-b");
    try {
      await app.request("/investments", {
        method: "POST",
        headers: userA.headers,
        body: JSON.stringify({ name: "A's holding", currentValue: 10 }),
      });
      await app.request("/investments", {
        method: "POST",
        headers: userB.headers,
        body: JSON.stringify({ name: "B's holding", currentValue: 20 }),
      });

      const res = await app.request("/investments", {
        headers: userA.headers,
      });
      const body = await res.json();

      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("A's holding");
    } finally {
      await userA.cleanup();
      await userB.cleanup();
    }
  });

  test("a holding with a costBasis set returns a computed gain/loss equal to currentValue minus costBasis", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-gain-loss",
    );
    try {
      const res = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Bitcoin",
          currentValue: 150,
          costBasis: 100,
        }),
      });
      const body = await res.json();

      expect(body.gainLoss).toBe(50);
    } finally {
      await cleanup();
    }
  });

  test("a holding with no costBasis returns no gain/loss value", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-no-gain-loss",
    );
    try {
      const res = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Bitcoin", currentValue: 150 }),
      });
      const body = await res.json();

      expect(body.gainLoss).toBeNull();
    } finally {
      await cleanup();
    }
  });

  test("a user can update only a holding's currentValue, leaving other fields and any wallet balance unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-update-current-value",
    );
    try {
      const walletRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Checking", balance: 500 }),
      });
      const wallet = await walletRes.json();

      const createRes = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Bitcoin",
          currentValue: 100,
          quantity: 0.01,
          color: "#22c55e",
          icon: "bitcoin",
        }),
      });
      const created = await createRes.json();

      const updateRes = await app.request(`/investments/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ currentValue: 175 }),
      });
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.currentValue).toBe(175);
      expect(updated.name).toBe("Bitcoin");
      expect(updated.quantity).toBe(0.01);
      expect(updated.color).toBe("#22c55e");
      expect(updated.icon).toBe("bitcoin");

      const walletListRes = await app.request("/wallets", { headers });
      const walletListBody = await walletListRes.json();
      expect(
        walletListBody.find((w: { id: string }) => w.id === wallet.id),
      ).toMatchObject({ balance: 500 });
    } finally {
      await cleanup();
    }
  });

  test("a user can add a costBasis to a holding that previously had none", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "investments-add-cost-basis",
    );
    try {
      const createRes = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Bitcoin", currentValue: 150 }),
      });
      const created = await createRes.json();
      expect(created.gainLoss).toBeNull();

      const updateRes = await app.request(`/investments/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ costBasis: 100 }),
      });
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.costBasis).toBe(100);
      expect(updated.gainLoss).toBe(50);
    } finally {
      await cleanup();
    }
  });

  test("a user cannot update another user's holding", async () => {
    const owner = await createSignedInUser("investments-update-owner");
    const attacker = await createSignedInUser("investments-update-attacker");
    try {
      const createRes = await app.request("/investments", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({ name: "Owner's holding", currentValue: 100 }),
      });
      const created = await createRes.json();

      const res = await app.request(`/investments/${created.id}`, {
        method: "PATCH",
        headers: attacker.headers,
        body: JSON.stringify({ currentValue: 999 }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("INVESTMENT_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("a user can delete a holding they own", async () => {
    const { headers, cleanup } = await createSignedInUser("investments-delete");
    try {
      const createRes = await app.request("/investments", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "To delete", currentValue: 1 }),
      });
      const created = await createRes.json();

      const deleteRes = await app.request(`/investments/${created.id}`, {
        method: "DELETE",
        headers,
      });
      expect(deleteRes.status).toBe(204);

      const listRes = await app.request("/investments", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("a user cannot delete another user's holding", async () => {
    const owner = await createSignedInUser("investments-delete-owner");
    const attacker = await createSignedInUser("investments-delete-attacker");
    try {
      const createRes = await app.request("/investments", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({ name: "Owner's holding", currentValue: 5 }),
      });
      const created = await createRes.json();

      const res = await app.request(`/investments/${created.id}`, {
        method: "DELETE",
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("INVESTMENT_NOT_FOUND");

      const listRes = await app.request("/investments", {
        headers: owner.headers,
      });
      const listBody = await listRes.json();
      expect(listBody).toHaveLength(1);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });
});
