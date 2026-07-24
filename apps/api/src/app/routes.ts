import type { Hono } from "hono";
import { walletsRouter } from "../modules/wallets/controllers";
import type { Env } from "./app";

export function registerRoutes(app: Hono<Env>) {
  return app.route("/wallets", walletsRouter);
}
