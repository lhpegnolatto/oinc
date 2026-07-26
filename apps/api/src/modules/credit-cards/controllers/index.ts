import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../../../shared/auth/require-auth";
import { db } from "../../../shared/db/client";
import { UnauthorizedError } from "../../../shared/errors";
import { zodValidationHook } from "../../../shared/validation/zod-validation-hook";
import { createCreditCard } from "../commands/create-credit-card";
import { createCreditCardPayment } from "../commands/create-credit-card-payment";
import { deleteCreditCard } from "../commands/delete-credit-card";
import { deleteCreditCardPayment } from "../commands/delete-credit-card-payment";
import { updateCreditCard } from "../commands/update-credit-card";
import type { CreditCard } from "../domain/credit-card";
import { getCardStatement } from "../queries/get-card-statement";
import { listCreditCards } from "../queries/list-credit-cards";
import { listPaymentsForCard } from "../queries/list-payments-for-card";
import { CreditCardPaymentsRepository } from "../repositories/credit-card-payments-repository";
import { CreditCardsRepository } from "../repositories/credit-cards-repository";
import { cardIdParamSchema } from "../schemas/card-id-param.schema";
import { createCreditCardSchema } from "../schemas/create-credit-card.schema";
import { createCreditCardPaymentSchema } from "../schemas/create-credit-card-payment.schema";
import { creditCardIdParamSchema } from "../schemas/credit-card-id-param.schema";
import { creditCardPaymentIdParamSchema } from "../schemas/credit-card-payment-id-param.schema";
import { toCreditCardPaymentResponse } from "../schemas/credit-card-payment-response.schema";
import { toCreditCardResponse } from "../schemas/credit-card-response.schema";
import { updateCreditCardSchema } from "../schemas/update-credit-card.schema";

const repo = new CreditCardsRepository(db);
const paymentsRepo = new CreditCardPaymentsRepository(db);

async function toCardResponseWithStatement(card: CreditCard) {
  const statement = await getCardStatement(repo, {
    cardId: card.id,
    statementCloseDay: card.statementCloseDay,
    dueDay: card.dueDay,
  });
  return toCreditCardResponse(card, statement);
}

// Mounted at root (see app/routes.ts), like the transactions module, since
// this module owns two distinct path shapes: the `/credit-cards`-prefixed
// card/charge-payment routes, and the flat `/credit-card-payments/:id` route
// (a payment isn't nested under its card for delete — see design.md's
// payments task list).
export const creditCardsRouter = new Hono()
  .use("*", requireAuth)
  .post(
    "/credit-cards",
    zValidator("json", createCreditCardSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const input = c.req.valid("json");
      const created = await createCreditCard(repo, {
        userId: user.id,
        ...input,
      });
      return c.json(await toCardResponseWithStatement(created), 201);
    },
  )
  .get("/credit-cards", async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const creditCards = await listCreditCards(repo, user.id);
    const responses = await Promise.all(
      creditCards.map((card) => toCardResponseWithStatement(card)),
    );
    return c.json(responses);
  })
  .patch(
    "/credit-cards/:id",
    zValidator("param", creditCardIdParamSchema, zodValidationHook),
    zValidator("json", updateCreditCardSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      const { name, color, icon, statementCloseDay, dueDay } =
        c.req.valid("json");
      const updated = await updateCreditCard(repo, {
        id,
        userId: user.id,
        name,
        color,
        icon,
        statementCloseDay,
        dueDay,
      });
      return c.json(await toCardResponseWithStatement(updated));
    },
  )
  .delete(
    "/credit-cards/:id",
    zValidator("param", creditCardIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      await deleteCreditCard(repo, { id, userId: user.id });
      return c.body(null, 204);
    },
  )
  .post(
    "/credit-cards/:cardId/payments",
    zValidator("param", cardIdParamSchema, zodValidationHook),
    zValidator("json", createCreditCardPaymentSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { cardId } = c.req.valid("param");
      const input = c.req.valid("json");
      const created = await createCreditCardPayment(paymentsRepo, {
        userId: user.id,
        cardId,
        ...input,
      });
      return c.json(toCreditCardPaymentResponse(created), 201);
    },
  )
  .get(
    "/credit-cards/:cardId/payments",
    zValidator("param", cardIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { cardId } = c.req.valid("param");
      const payments = await listPaymentsForCard(
        { creditCards: repo, payments: paymentsRepo },
        { cardId, userId: user.id },
      );
      return c.json(payments.map(toCreditCardPaymentResponse));
    },
  )
  .delete(
    "/credit-card-payments/:id",
    zValidator("param", creditCardPaymentIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      await deleteCreditCardPayment(paymentsRepo, { id, userId: user.id });
      return c.body(null, 204);
    },
  );
