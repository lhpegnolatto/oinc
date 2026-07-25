import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const apiRoot = fileURLToPath(new URL("../../../../../api", import.meta.url));

const webPort = 3104;
const apiPort = 3001; // must match apps/web's .env's NEXT_PUBLIC_API_URL
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
// Postgres database that apps/api's own test suite uses — see
// dashboard.test.ts, which this mirrors.
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

describe("sidebar navigation", () => {
  test("a signed-in user's sidebar includes the Transactions link and its nested Categories link", async () => {
    const name = "Ada Lovelace";
    const email = `sidebar-nav-${crypto.randomUUID()}@example.com`;
    const { userId, cookie } = await seedSession(name, email);

    try {
      const res = await fetch(`${webUrl}/dashboard`, { headers: { cookie } });
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toContain('href="/transactions"');
      expect(body).toContain('href="/transactions/categories"');
      expect(body).toContain("Transactions");
      expect(body).toContain("Categories");
    } finally {
      await deleteTestUser(userId);
    }
  });
});
