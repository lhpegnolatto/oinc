import { dbEnv } from "@oinc/env/server";
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    WEB_APP_URL: z.string().url(),
  },
  extends: [dbEnv],
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
