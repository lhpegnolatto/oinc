import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
