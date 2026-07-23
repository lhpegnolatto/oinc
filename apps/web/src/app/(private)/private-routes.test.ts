import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("../../..", import.meta.url));
const apiRoot = fileURLToPath(new URL("../../../../api", import.meta.url));

const webPort = 3102;
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

describe("(private)/ route guarding", () => {
  test("signed-out request to a private route redirects to /sign-in before rendering", async () => {
    const res = await fetch(`${webUrl}/dashboard`);
    expect(res.url).toBe(`${webUrl}/sign-in`);
    expect(res.status).toBe(200);
  });

  test("a stale/invalid session cookie is caught by the authoritative check", async () => {
    const res = await fetch(`${webUrl}/dashboard`, {
      headers: {
        // Syntactically a Better Auth session cookie, but not a real session
        // — simulates both a revoked session and a post-sign-out cookie.
        cookie: "better-auth.session_token=not-a-real-session-token",
      },
    });
    expect(res.url).toBe(`${webUrl}/sign-in`);
    expect(res.status).toBe(200);
  });

  test("signed-out request to the root route redirects to /sign-in", async () => {
    const res = await fetch(webUrl);
    expect(res.url).toBe(`${webUrl}/sign-in`);
    expect(res.status).toBe(200);
  });
});
