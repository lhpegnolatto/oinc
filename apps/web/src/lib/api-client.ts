import type { AppType } from "@fynn/api";
import { hc } from "hono/client";
import { env } from "@/env";

// apps/web calls apps/api's origin directly (no proxy), so the session
// cookie is always cross-origin from the browser's point of view — this
// must be explicit or the cookie is silently never sent.
export const apiClient = hc<AppType>(env.NEXT_PUBLIC_API_URL, {
  init: { credentials: "include" },
});
