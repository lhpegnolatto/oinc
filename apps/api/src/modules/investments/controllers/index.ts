import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../../../shared/auth/require-auth";
import { db } from "../../../shared/db/client";
import { UnauthorizedError } from "../../../shared/errors";
import { zodValidationHook } from "../../../shared/validation/zod-validation-hook";
import { createInvestment } from "../commands/create-investment";
import { deleteInvestment } from "../commands/delete-investment";
import { updateInvestment } from "../commands/update-investment";
import { listInvestments } from "../queries/list-investments";
import { InvestmentsRepository } from "../repositories/investments-repository";
import { createInvestmentSchema } from "../schemas/create-investment.schema";
import { investmentIdParamSchema } from "../schemas/investment-id-param.schema";
import { toInvestmentResponse } from "../schemas/investment-response.schema";
import { updateInvestmentSchema } from "../schemas/update-investment.schema";

const repo = new InvestmentsRepository(db);

export const investmentsRouter = new Hono()
  .use("*", requireAuth)
  .post(
    "/",
    zValidator("json", createInvestmentSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const input = c.req.valid("json");
      const created = await createInvestment(repo, {
        userId: user.id,
        ...input,
      });
      return c.json(toInvestmentResponse(created), 201);
    },
  )
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const investments = await listInvestments(repo, user.id);
    return c.json(investments.map(toInvestmentResponse));
  })
  .patch(
    "/:id",
    zValidator("param", investmentIdParamSchema, zodValidationHook),
    zValidator("json", updateInvestmentSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      const changes = c.req.valid("json");
      const updated = await updateInvestment(repo, {
        id,
        userId: user.id,
        ...changes,
      });
      return c.json(toInvestmentResponse(updated));
    },
  )
  .delete(
    "/:id",
    zValidator("param", investmentIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      await deleteInvestment(repo, { id, userId: user.id });
      return c.body(null, 204);
    },
  );
