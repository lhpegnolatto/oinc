import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../../../shared/auth/require-auth";
import { db } from "../../../shared/db/client";
import { UnauthorizedError } from "../../../shared/errors";
import { zodValidationHook } from "../../../shared/validation/zod-validation-hook";
import { createTransaction } from "../commands/create-transaction";
import { deleteTransaction } from "../commands/delete-transaction";
import { updateTransaction } from "../commands/update-transaction";
import { listTransactionsForUser } from "../queries/list-transactions-for-user";
import { listTransactionsForWallet } from "../queries/list-transactions-for-wallet";
import { TransactionsRepository } from "../repositories/transactions-repository";
import { createTransactionSchema } from "../schemas/create-transaction.schema";
import { listTransactionsQuerySchema } from "../schemas/list-transactions-query.schema";
import { transactionIdParamSchema } from "../schemas/transaction-id-param.schema";
import {
  toTransactionResponse,
  toTransactionWithWalletResponse,
} from "../schemas/transaction-response.schema";
import { updateTransactionSchema } from "../schemas/update-transaction.schema";
import { walletIdParamSchema } from "../schemas/wallet-id-param.schema";

const repo = new TransactionsRepository(db);

// Mounted at root (see app/routes.ts) since this module owns two distinct
// path shapes: wallet-scoped create/list, and flat transaction-id-scoped
// update/delete — a single "/transactions" prefix can't express both.
export const transactionsRouter = new Hono()
  .use("*", requireAuth)
  .post(
    "/wallets/:walletId/transactions",
    zValidator("param", walletIdParamSchema, zodValidationHook),
    zValidator("json", createTransactionSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { walletId } = c.req.valid("param");
      const input = c.req.valid("json");
      const created = await createTransaction(repo, {
        userId: user.id,
        walletId,
        ...input,
      });
      return c.json(toTransactionResponse(created), 201);
    },
  )
  .get(
    "/wallets/:walletId/transactions",
    zValidator("param", walletIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { walletId } = c.req.valid("param");
      const transactions = await listTransactionsForWallet(repo, {
        walletId,
        userId: user.id,
      });
      return c.json(transactions.map(toTransactionResponse));
    },
  )
  .get(
    "/transactions",
    zValidator("query", listTransactionsQuerySchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const filters = c.req.valid("query");
      const transactions = await listTransactionsForUser(repo, {
        userId: user.id,
        ...filters,
      });
      return c.json(transactions.map(toTransactionWithWalletResponse));
    },
  )
  .patch(
    "/transactions/:id",
    zValidator("param", transactionIdParamSchema, zodValidationHook),
    zValidator("json", updateTransactionSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const updated = await updateTransaction(repo, {
        id,
        userId: user.id,
        ...input,
      });
      return c.json(toTransactionResponse(updated));
    },
  )
  .delete(
    "/transactions/:id",
    zValidator("param", transactionIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      await deleteTransaction(repo, { id, userId: user.id });
      return c.body(null, 204);
    },
  );
