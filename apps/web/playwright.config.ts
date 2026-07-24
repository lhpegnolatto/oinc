import { defineConfig } from "@playwright/test";

// Must match apps/api's WEB_APP_URL (its CORS allow-origin and Better Auth
// trustedOrigins are both pinned to this exact origin) — unlike the
// bun:test files, Playwright drives a real browser, so a mismatched port
// here gets silently blocked by CORS instead of just being a fetch() call.
const webPort = 3000;
const apiPort = 3001; // must match apps/web's .env NEXT_PUBLIC_API_URL

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${webPort}`,
  },
  webServer: [
    {
      command: "bun run src/index.ts",
      cwd: "../api",
      port: apiPort,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `node_modules/.bin/next dev --port ${webPort}`,
      port: webPort,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
