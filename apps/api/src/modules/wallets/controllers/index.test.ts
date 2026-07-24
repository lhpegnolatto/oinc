import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { app } from "../../../app/app";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";

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
    // wallet.userId FK is onDelete: cascade, so deleting the user cleans up
    // every wallet it created during the test — no separate wallet cleanup.
    cleanup: () => helpers.deleteUser(savedUser.id),
  };
}

describe("wallets controller", () => {
  test("a signed-in user can create a wallet with a name and balance", async () => {
    const { headers, cleanup } = await createSignedInUser("wallets-create");
    try {
      const res = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Checking", balance: 100.5 }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe("Checking");
      expect(body.balance).toBe(100.5);
    } finally {
      await cleanup();
    }
  });

  test("creating a wallet with an empty name is rejected with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser("wallets-empty-name");
    try {
      const res = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "", balance: 0 }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/wallets", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("an unauthenticated request to a wallets endpoint is rejected with 401", async () => {
    const res = await app.request("/wallets");
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("listing wallets returns only the requesting user's wallets, not another user's", async () => {
    const userA = await createSignedInUser("wallets-list-a");
    const userB = await createSignedInUser("wallets-list-b");
    try {
      await app.request("/wallets", {
        method: "POST",
        headers: userA.headers,
        body: JSON.stringify({ name: "A's wallet", balance: 10 }),
      });
      await app.request("/wallets", {
        method: "POST",
        headers: userB.headers,
        body: JSON.stringify({ name: "B's wallet", balance: 20 }),
      });

      const res = await app.request("/wallets", { headers: userA.headers });
      const body = await res.json();

      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("A's wallet");
    } finally {
      await userA.cleanup();
      await userB.cleanup();
    }
  });

  test("a user can rename a wallet they own, and its balance is unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser("wallets-rename");
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Old name", balance: 42 }),
      });
      const created = await createRes.json();

      const renameRes = await app.request(`/wallets/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: "New name" }),
      });
      const renamed = await renameRes.json();

      expect(renameRes.status).toBe(200);
      expect(renamed.name).toBe("New name");
      expect(renamed.balance).toBe(42);
    } finally {
      await cleanup();
    }
  });

  test("a user cannot rename another user's wallet", async () => {
    const owner = await createSignedInUser("wallets-rename-owner");
    const attacker = await createSignedInUser("wallets-rename-attacker");
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({ name: "Owner's wallet", balance: 5 }),
      });
      const created = await createRes.json();

      const res = await app.request(`/wallets/${created.id}`, {
        method: "PATCH",
        headers: attacker.headers,
        body: JSON.stringify({ name: "Hijacked" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("a user can delete a wallet they own", async () => {
    const { headers, cleanup } = await createSignedInUser("wallets-delete");
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "To delete", balance: 1 }),
      });
      const created = await createRes.json();

      const deleteRes = await app.request(`/wallets/${created.id}`, {
        method: "DELETE",
        headers,
      });
      expect(deleteRes.status).toBe(204);

      const listRes = await app.request("/wallets", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("creating a wallet with a valid color and icon persists and returns both fields", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "wallets-create-appearance",
    );
    try {
      const res = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Savings",
          balance: 200,
          color: "#22C55E",
          icon: "piggy-bank",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.color).toBe("#22c55e");
      expect(body.icon).toBe("piggy-bank");
    } finally {
      await cleanup();
    }
  });

  test("creating a wallet with an icon outside the curated set is rejected with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "wallets-create-bad-icon",
    );
    try {
      const res = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Savings",
          balance: 200,
          color: "#22c55e",
          icon: "not-a-real-icon",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/wallets", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("creating a wallet with an invalid hex color is rejected with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "wallets-create-bad-color",
    );
    try {
      const res = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Savings",
          balance: 200,
          color: "not-a-color",
          icon: "wallet",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/wallets", { headers });
      const listBody = await listRes.json();
      expect(listBody).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  test("updating a wallet's color and icon persists the change and leaves balance unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "wallets-update-appearance",
    );
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Checking", balance: 42 }),
      });
      const created = await createRes.json();

      const updateRes = await app.request(`/wallets/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: "Checking",
          color: "#f97316",
          icon: "landmark",
        }),
      });
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.color).toBe("#f97316");
      expect(updated.icon).toBe("landmark");
      expect(updated.balance).toBe(42);
    } finally {
      await cleanup();
    }
  });

  test("updating a wallet with an invalid color or icon is rejected and the wallet is unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "wallets-update-bad-appearance",
    );
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Checking",
          balance: 42,
          color: "#22c55e",
          icon: "wallet",
        }),
      });
      const created = await createRes.json();

      const updateRes = await app.request(`/wallets/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: "Checking", color: "nope" }),
      });
      const updateBody = await updateRes.json();

      expect(updateRes.status).toBe(400);
      expect(updateBody.error.code).toBe("VALIDATION_ERROR");

      const listRes = await app.request("/wallets", { headers });
      const listBody = await listRes.json();
      expect(listBody[0].color).toBe("#22c55e");
      expect(listBody[0].icon).toBe("wallet");
    } finally {
      await cleanup();
    }
  });

  test("a user cannot update another user's wallet's appearance", async () => {
    const owner = await createSignedInUser("wallets-update-appearance-owner");
    const attacker = await createSignedInUser(
      "wallets-update-appearance-attacker",
    );
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          name: "Owner's wallet",
          balance: 5,
          color: "#22c55e",
          icon: "wallet",
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/wallets/${created.id}`, {
        method: "PATCH",
        headers: attacker.headers,
        body: JSON.stringify({
          name: "Hijacked",
          color: "#f97316",
          icon: "landmark",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("a user cannot delete another user's wallet", async () => {
    const owner = await createSignedInUser("wallets-delete-owner");
    const attacker = await createSignedInUser("wallets-delete-attacker");
    try {
      const createRes = await app.request("/wallets", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({ name: "Owner's wallet", balance: 5 }),
      });
      const created = await createRes.json();

      const res = await app.request(`/wallets/${created.id}`, {
        method: "DELETE",
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("WALLET_NOT_FOUND");

      const listRes = await app.request("/wallets", { headers: owner.headers });
      const listBody = await listRes.json();
      expect(listBody).toHaveLength(1);
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });
});
