import { describe, expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { Hono } from "hono";
import type { Env } from "../../app/app";
import { env } from "../../env";
import { db } from "../db/client";
import { errorHandler } from "../middleware/error-handler";
import { auth } from "./index";
import { requireAuth } from "./require-auth";

// Test-only Better Auth instance sharing the same DB + secret as the real
// `auth`, so its sessions are valid when checked through `auth.api.getSession`.
// Kept separate (rather than adding testUtils() to the real instance) so the
// helpers never ship as part of the production auth config.
const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [testUtils()],
});

function buildTestApp() {
  const app = new Hono<Env>();
  app.onError(errorHandler);
  app.use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set("user", session?.user ?? null);
    c.set("session", session?.session ?? null);
    await next();
  });
  app.get("/public", (c) =>
    c.json({ user: c.get("user"), session: c.get("session") }),
  );
  app.get("/guarded", requireAuth, (c) =>
    c.json({ user: c.get("user"), session: c.get("session") }),
  );
  return app;
}

describe("auth middleware", () => {
  test("public route ignores missing session", async () => {
    const app = buildTestApp();

    const res = await app.request("/public");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toBeNull();
    expect(body.session).toBeNull();
  });

  test("guarded route rejects unauthenticated request with the shared 401 shape", async () => {
    const app = buildTestApp();

    const res = await app.request("/guarded");
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("authenticated request is recognized on both a public and a guarded route", async () => {
    const ctx = await testAuth.$context;
    const { test: helpers } = ctx;
    const user = helpers.createUser({
      email: `auth-mw-${crypto.randomUUID()}@example.com`,
    });
    const savedUser = await helpers.saveUser(user);

    try {
      const headers = await helpers.getAuthHeaders({ userId: savedUser.id });
      const app = buildTestApp();

      const publicRes = await app.request("/public", { headers });
      const publicBody = await publicRes.json();
      expect(publicBody.user.id).toBe(savedUser.id);

      const guardedRes = await app.request("/guarded", { headers });
      const guardedBody = await guardedRes.json();
      expect(guardedRes.status).toBe(200);
      expect(guardedBody.user.id).toBe(savedUser.id);
    } finally {
      await helpers.deleteUser(savedUser.id);
    }
  });
});
