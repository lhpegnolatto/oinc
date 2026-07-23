import type { Hono } from "hono";
import type { Env } from "./app";

export function registerRoutes(app: Hono<Env>) {
  return app;
}
