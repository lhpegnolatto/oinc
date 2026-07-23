import { dbEnv } from "@fynn/env/server";
import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
  server: {},
  extends: [dbEnv],
  runtimeEnv: process.env,
});
