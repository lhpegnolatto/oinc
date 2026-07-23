import { createMiddleware } from "hono/factory";
import type { Env } from "../../app/app";
import { UnauthorizedError } from "../errors";

// Routes are public by default; apply this explicitly to guard a route/router.
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  if (!c.get("user")) {
    throw new UnauthorizedError();
  }
  await next();
});
