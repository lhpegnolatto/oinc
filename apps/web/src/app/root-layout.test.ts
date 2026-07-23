import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../..", import.meta.url));
const port = 3100;
const url = `http://localhost:${port}`;

let devServer: ReturnType<typeof Bun.spawn>;

async function waitUntilReady() {
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
  throw new Error("apps/web dev server did not become ready in time");
}

beforeAll(async () => {
  devServer = Bun.spawn(
    [`${appRoot}node_modules/.bin/next`, "dev", "--port", String(port)],
    {
      cwd: appRoot,
      stdout: "ignore",
      stderr: "ignore",
    },
  );
  await waitUntilReady();
}, 60_000);

afterAll(() => {
  devServer.kill();
});

describe("root layout", () => {
  test("renders the public route without a server or client error", async () => {
    const res = await fetch(url);
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(body).not.toContain("Application error");
  });
});
