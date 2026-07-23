import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const apiRoot = fileURLToPath(new URL("../../../../../api", import.meta.url));

const webPort = 3103;
const apiPort = 3001; // must match apps/web/.env's NEXT_PUBLIC_API_URL
const webUrl = `http://localhost:${webPort}`;

let webServer: ReturnType<typeof Bun.spawn>;
let apiServer: ReturnType<typeof Bun.spawn>;

async function waitUntilReady(url: string) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not accepting connections yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`server at ${url} did not become ready in time`);
}

// Seeds a real Better Auth session directly into the (real, non-mocked)
// Postgres database that apps/api's own test suite uses, via better-auth's
// `testUtils` plugin — the same mechanism apps/api/src/shared/auth/auth.test.ts
// uses to bypass the Google OAuth dance for a real DB-backed session.
// Runs as a separate `bun` process (cwd: apiRoot) so apps/api's dependencies
// (drizzle-orm, better-auth/plugins) resolve without apps/web declaring a
// runtime dependency on apps/api — matching the type-only workspace boundary
// described in .docs/architecture/frontend.md.
const SEED_SCRIPT = `
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { db } from "./src/shared/db/client";
import { env } from "./src/env";

const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [testUtils()],
});

const ctx = await testAuth.$context;
const { test: helpers } = ctx;
const user = helpers.createUser({ name: process.argv[1], email: process.argv[2] });
const savedUser = await helpers.saveUser(user);
const headers = await helpers.getAuthHeaders({ userId: savedUser.id });
console.log(JSON.stringify({ userId: savedUser.id, cookie: headers.get("cookie") }));
process.exit(0);
`;

const DELETE_SCRIPT = `
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { db } from "./src/shared/db/client";
import { env } from "./src/env";

const testAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [testUtils()],
});

const ctx = await testAuth.$context;
await ctx.test.deleteUser(process.argv[1]);
process.exit(0);
`;

async function seedSession(name: string, email: string) {
  const proc = Bun.spawn(["bun", "-e", SEED_SCRIPT, "--", name, email], {
    cwd: apiRoot,
    stdout: "pipe",
    stderr: "ignore",
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  return JSON.parse(output.trim().split("\n").pop() ?? "{}") as {
    userId: string;
    cookie: string;
  };
}

async function deleteTestUser(userId: string) {
  const proc = Bun.spawn(["bun", "-e", DELETE_SCRIPT, "--", userId], {
    cwd: apiRoot,
    stdout: "ignore",
    stderr: "ignore",
  });
  await proc.exited;
}

beforeAll(async () => {
  apiServer = Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: apiRoot,
    stdout: "ignore",
    stderr: "ignore",
  });
  webServer = Bun.spawn(
    [`${webRoot}node_modules/.bin/next`, "dev", "--port", String(webPort)],
    {
      cwd: webRoot,
      stdout: "ignore",
      stderr: "ignore",
    },
  );
  await Promise.all([
    waitUntilReady(`http://localhost:${apiPort}`),
    waitUntilReady(webUrl),
  ]);
}, 60_000);

afterAll(() => {
  webServer.kill();
  apiServer.kill();
});

describe("/dashboard shell", () => {
  test("a signed-in user sees the shared shell with their own identity and can sign out from it", async () => {
    const name = "Ada Lovelace";
    const email = `dashboard-shell-${crypto.randomUUID()}@example.com`;
    const { userId, cookie } = await seedSession(name, email);

    try {
      const res = await fetch(`${webUrl}/dashboard`, { headers: { cookie } });
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toContain(name);
      expect(body).toContain(email);
      expect(body).toContain("Dashboard");
      // The sign-out action lives inside nav-user's dropdown, which base-ui
      // only mounts once opened — its trigger rendering is what a static
      // fetch can verify; the actual open→sign-out interaction is covered
      // by the manual browser verification in tasks.md 7.1.
      expect(body).toContain("lucide-ellipsis-vertical");
    } finally {
      await deleteTestUser(userId);
    }
  });
});
