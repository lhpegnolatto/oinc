import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "../env";
import { auth } from "../shared/auth";
import { errorHandler } from "../shared/middleware/error-handler";
import { requestLogging } from "../shared/middleware/logging";
import {
  type RequestIdVariables,
  requestId,
} from "../shared/middleware/request-id";
import { registerRoutes } from "./routes";

export type Env = {
  Variables: RequestIdVariables & {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export const app = new Hono<Env>();

app.use("*", requestId());
app.use("*", requestLogging());

// Browser calls apps/api directly from apps/web's origin — every credentialed
// request (auth endpoints, any requireAuth-guarded route) needs an explicit
// origin here, never "*", per the Fetch spec's credentialed-request rules.
app.use(
  "*",
  cors({
    origin: env.WEB_APP_URL,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Runs on every request: attaches user/session if present, but never blocks.
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

app.onError(errorHandler);

// `.route()` mutates `app` in place and returns `this`, but only the return
// value carries the merged route-map type Hono needs to type-check the RPC
// client — capturing it (rather than discarding registerRoutes(app)'s
// result) is required for apps/web's hc<AppType>() to see any module route.
const routedApp = registerRoutes(app);

// Exported for apps/web's Hono RPC client — see "Web ↔ API type safety" in frontend.md.
export type AppType = typeof routedApp;
