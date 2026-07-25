import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { app } from "../../../app/app";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";
import { transaction } from "../../../shared/db/schema";

// Mirrors wallets' controllers/index.test.ts approach: a test-only Better
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
    // category.userId FK is onDelete: cascade, so deleting the user cleans
    // up every custom category it created during the test.
    cleanup: () => helpers.deleteUser(savedUser.id),
  };
}

describe("categories controller", () => {
  test("system categories appear for every signed-in user", async () => {
    const { headers, cleanup } = await createSignedInUser("categories-system");
    try {
      const res = await app.request("/categories", { headers });
      const body = await res.json();

      expect(res.status).toBe(200);
      const systemFood = body.find(
        (c: { id: string }) => c.id === "system-food",
      );
      expect(systemFood).toBeDefined();
      expect(systemFood.system).toBe(true);
      expect(systemFood.type).toBe("expense");
    } finally {
      await cleanup();
    }
  });

  test("a user cannot update a system category", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "categories-system-update",
    );
    try {
      const res = await app.request("/categories/system-food", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: "Hijacked" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CATEGORY_NOT_FOUND");

      const listRes = await app.request("/categories", { headers });
      const listBody = await listRes.json();
      const systemFood = listBody.find(
        (c: { id: string }) => c.id === "system-food",
      );
      expect(systemFood.name).toBe("Food & Dining");
    } finally {
      await cleanup();
    }
  });

  test("a user cannot delete a system category", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "categories-system-delete",
    );
    try {
      const res = await app.request("/categories/system-food", {
        method: "DELETE",
        headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CATEGORY_NOT_FOUND");

      const listRes = await app.request("/categories", { headers });
      const listBody = await listRes.json();
      expect(listBody.some((c: { id: string }) => c.id === "system-food")).toBe(
        true,
      );
    } finally {
      await cleanup();
    }
  });

  test("a signed-in user can create a custom category", async () => {
    const { headers, cleanup } = await createSignedInUser("categories-create");
    try {
      const res = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Side hustle",
          type: "income",
          color: "#22C55E",
          icon: "briefcase",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.name).toBe("Side hustle");
      expect(body.type).toBe("income");
      expect(body.color).toBe("#22c55e");
      expect(body.icon).toBe("briefcase");
      expect(body.system).toBe(false);
    } finally {
      await cleanup();
    }
  });

  test("creating a category without a name fails with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "categories-empty-name",
    );
    try {
      const res = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "",
          type: "expense",
          color: "#22c55e",
          icon: "briefcase",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      await cleanup();
    }
  });

  test("creating a category with an invalid color or icon fails with a validation error", async () => {
    const { headers, cleanup } = await createSignedInUser(
      "categories-bad-appearance",
    );
    try {
      const badColorRes = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Test",
          type: "expense",
          color: "not-a-color",
          icon: "briefcase",
        }),
      });
      expect(badColorRes.status).toBe(400);

      const badIconRes = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Test",
          type: "expense",
          color: "#22c55e",
          icon: "not-a-real-icon",
        }),
      });
      expect(badIconRes.status).toBe(400);
    } finally {
      await cleanup();
    }
  });

  test("a user can update their own custom category's name and appearance, and type stays unchanged", async () => {
    const { headers, cleanup } = await createSignedInUser("categories-update");
    try {
      const createRes = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Old name",
          type: "expense",
          color: "#22c55e",
          icon: "briefcase",
        }),
      });
      const created = await createRes.json();

      const updateRes = await app.request(`/categories/${created.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: "New name",
          color: "#f97316",
          icon: "car",
        }),
      });
      const updated = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updated.name).toBe("New name");
      expect(updated.color).toBe("#f97316");
      expect(updated.icon).toBe("car");
      expect(updated.type).toBe("expense");
    } finally {
      await cleanup();
    }
  });

  test("a user cannot update another user's custom category", async () => {
    const owner = await createSignedInUser("categories-update-owner");
    const attacker = await createSignedInUser("categories-update-attacker");
    try {
      const createRes = await app.request("/categories", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          name: "Owner's category",
          type: "expense",
          color: "#22c55e",
          icon: "briefcase",
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/categories/${created.id}`, {
        method: "PATCH",
        headers: attacker.headers,
        body: JSON.stringify({ name: "Hijacked" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CATEGORY_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("a user can delete an unused custom category they own", async () => {
    const { headers, cleanup } = await createSignedInUser("categories-delete");
    try {
      const createRes = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "To delete",
          type: "expense",
          color: "#22c55e",
          icon: "briefcase",
        }),
      });
      const created = await createRes.json();

      const deleteRes = await app.request(`/categories/${created.id}`, {
        method: "DELETE",
        headers,
      });
      expect(deleteRes.status).toBe(204);

      const listRes = await app.request("/categories", { headers });
      const listBody = await listRes.json();
      expect(listBody.some((c: { id: string }) => c.id === created.id)).toBe(
        false,
      );
    } finally {
      await cleanup();
    }
  });

  test("a user cannot delete another user's custom category", async () => {
    const owner = await createSignedInUser("categories-delete-owner");
    const attacker = await createSignedInUser("categories-delete-attacker");
    try {
      const createRes = await app.request("/categories", {
        method: "POST",
        headers: owner.headers,
        body: JSON.stringify({
          name: "Owner's category",
          type: "expense",
          color: "#22c55e",
          icon: "briefcase",
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/categories/${created.id}`, {
        method: "DELETE",
        headers: attacker.headers,
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe("CATEGORY_NOT_FOUND");
    } finally {
      await owner.cleanup();
      await attacker.cleanup();
    }
  });

  test("deleting a custom category still referenced by a transaction fails with a conflict, and leaves it intact", async () => {
    const { userId, headers, cleanup } =
      await createSignedInUser("categories-in-use");
    try {
      const categoryRes = await app.request("/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "In use",
          type: "expense",
          color: "#22c55e",
          icon: "briefcase",
        }),
      });
      const category = await categoryRes.json();

      const walletRes = await app.request("/wallets", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Checking", balance: 100 }),
      });
      const createdWallet = await walletRes.json();

      // Inserted directly: the transactions module isn't built yet at this
      // point in the change, and this test only needs a row referencing the
      // category to exist, not the transactions module's own behavior.
      await db.insert(transaction).values({
        id: crypto.randomUUID(),
        walletId: createdWallet.id,
        categoryId: category.id,
        userId,
        type: "expense",
        amount: 10,
        date: "2026-01-01",
      });

      const deleteRes = await app.request(`/categories/${category.id}`, {
        method: "DELETE",
        headers,
      });
      const deleteBody = await deleteRes.json();

      expect(deleteRes.status).toBe(409);
      expect(deleteBody.error.code).toBe("CATEGORY_IN_USE");

      const listRes = await app.request("/categories", { headers });
      const listBody = await listRes.json();
      expect(listBody.some((c: { id: string }) => c.id === category.id)).toBe(
        true,
      );
    } finally {
      // user cascade -> wallet -> transaction, and category.userId ->
      // user cascade, so this alone cleans up everything created above.
      await cleanup();
    }
  });
});
