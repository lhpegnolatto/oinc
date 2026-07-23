import { describe, expect, spyOn, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { env } from "../../../env";
import { db } from "../../../shared/db/client";
import { seedNewUserDefaults } from "./seed-new-user-defaults";

// Mirrors shared/auth's databaseHooks wiring (user.create.after ->
// seedNewUserDefaults) so it can be exercised without a real Google OAuth
// round trip — same pattern shared/auth/auth.test.ts uses for session checks.
const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await seedNewUserDefaults(user.id);
        },
      },
    },
  },
  plugins: [testUtils()],
});

describe("seedNewUserDefaults wiring", () => {
  test("new user is seeded on first sign-in", async () => {
    const ctx = await testAuth.$context;
    const user = ctx.test.createUser({
      email: `seed-new-${crypto.randomUUID()}@example.com`,
    });

    const logSpy = spyOn(console, "log");
    try {
      const saved = await ctx.test.saveUser(user);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0]?.[0]).toContain(saved.id);
    } finally {
      logSpy.mockRestore();
      await ctx.test.deleteUser(user.id);
    }
  });

  test("existing user sign-in does not reseed", async () => {
    const ctx = await testAuth.$context;
    const user = ctx.test.createUser({
      email: `seed-existing-${crypto.randomUUID()}@example.com`,
    });
    const saved = await ctx.test.saveUser(user);

    const logSpy = spyOn(console, "log");
    try {
      // Simulate a repeat sign-in: resolving a session for the already-created
      // user never re-triggers user.create.after.
      const headers = await ctx.test.getAuthHeaders({ userId: saved.id });
      await testAuth.api.getSession({ headers });
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      await ctx.test.deleteUser(saved.id);
    }
  });
});
