import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL("../../api", import.meta.url));

// Mirrors src/app/(private)/dashboard/dashboard.test.ts's approach: seed a
// real Better Auth session directly into the Postgres database apps/api
// uses, via better-auth's `testUtils` plugin, so e2e specs can start already
// signed in instead of driving the Google OAuth dance. Runs as a separate
// `bun` process (cwd: apiRoot) so apps/api's dependencies resolve without
// apps/web declaring a runtime dependency on apps/api.
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

function runInApiRoot(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", args, { cwd: apiRoot });
    let output = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`seed-session script exited with code ${code}`));
        return;
      }
      resolve(output);
    });
  });
}

export async function seedSignedInUser(name: string, email: string) {
  const output = await runInApiRoot(["-e", SEED_SCRIPT, "--", name, email]);
  const { userId, cookie } = JSON.parse(
    output.trim().split("\n").pop() ?? "{}",
  ) as { userId: string; cookie: string };
  return { userId, cookie };
}

export async function deleteSeededUser(userId: string) {
  await runInApiRoot(["-e", DELETE_SCRIPT, "--", userId]);
}

// The cookie header returned by better-auth's testUtils is in `Cookie:`
// request-header format ("name=value; name2=value2"), not the structured
// shape Playwright's context.addCookies() needs — both apps run on
// `localhost` (different ports only), so a host-only cookie is visible to
// both, matching how the real cross-origin sign-in flow behaves in dev
// (see shared/auth/index.ts's sameSite: "none" comment in apps/api).
export function cookieHeaderToPlaywrightCookies(cookieHeader: string) {
  return cookieHeader.split("; ").map((pair) => {
    const separatorIndex = pair.indexOf("=");
    return {
      name: pair.slice(0, separatorIndex),
      value: pair.slice(separatorIndex + 1),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "None" as const,
    };
  });
}
