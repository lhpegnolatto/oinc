import type { Hono } from "hono";
import { categoriesRouter } from "../modules/categories/controllers";
import { creditCardsRouter } from "../modules/credit-cards/controllers";
import { investmentsRouter } from "../modules/investments/controllers";
import { transactionsRouter } from "../modules/transactions/controllers";
import { walletsRouter } from "../modules/wallets/controllers";
import type { Env } from "./app";

export function registerRoutes(app: Hono<Env>) {
  return app
    .route("/wallets", walletsRouter)
    .route("/categories", categoriesRouter)
    .route("/investments", investmentsRouter)
    .route("/", creditCardsRouter)
    .route("/", transactionsRouter);
}
