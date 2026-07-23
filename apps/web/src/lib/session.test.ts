import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL("../../../api", import.meta.url));
const apiPort = 3001; // must match apps/web/.env's NEXT_PUBLIC_API_URL

let apiServer: ReturnType<typeof Bun.spawn>;
let mockCookie: string | null = null;

mock.module("next/headers", () => ({
  headers: async () =>
    new Headers(mockCookie ? { cookie: mockCookie } : undefined),
}));

const { getSessionUser } = await import("./session");

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
  await waitUntilReady(`http://localhost:${apiPort}`);
}, 60_000);

afterAll(() => {
  apiServer.kill();
});

afterEach(() => {
  mockCookie = null;
});

describe("getSessionUser", () => {
  test("returns null when no session cookie is present", async () => {
    mockCookie = null;

    expect(await getSessionUser()).toBeNull();
  });

  test("returns null when the session cookie is stale/invalid", async () => {
    mockCookie = "better-auth.session_token=not-a-real-session-token";

    expect(await getSessionUser()).toBeNull();
  });
});
