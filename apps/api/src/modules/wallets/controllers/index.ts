import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requireAuth } from "../../../shared/auth/require-auth";
import { db } from "../../../shared/db/client";
import { UnauthorizedError } from "../../../shared/errors";
import { zodValidationHook } from "../../../shared/validation/zod-validation-hook";
import { createWallet } from "../commands/create-wallet";
import { deleteWallet } from "../commands/delete-wallet";
import { updateWallet } from "../commands/update-wallet";
import { listWallets } from "../queries/list-wallets";
import { WalletsRepository } from "../repositories/wallets-repository";
import { createWalletSchema } from "../schemas/create-wallet.schema";
import { updateWalletSchema } from "../schemas/update-wallet.schema";
import { walletIdParamSchema } from "../schemas/wallet-id-param.schema";
import { toWalletResponse } from "../schemas/wallet-response.schema";

const repo = new WalletsRepository(db);

export const walletsRouter = new Hono()
  .use("*", requireAuth)
  .post(
    "/",
    zValidator("json", createWalletSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const input = c.req.valid("json");
      const created = await createWallet(repo, { userId: user.id, ...input });
      return c.json(toWalletResponse(created), 201);
    },
  )
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const wallets = await listWallets(repo, user.id);
    return c.json(wallets.map(toWalletResponse));
  })
  .patch(
    "/:id",
    zValidator("param", walletIdParamSchema, zodValidationHook),
    zValidator("json", updateWalletSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      const { name, color, icon } = c.req.valid("json");
      const updated = await updateWallet(repo, {
        id,
        userId: user.id,
        name,
        color,
        icon,
      });
      return c.json(toWalletResponse(updated));
    },
  )
  .delete(
    "/:id",
    zValidator("param", walletIdParamSchema, zodValidationHook),
    async (c) => {
      const user = c.get("user");
      if (!user) throw new UnauthorizedError();

      const { id } = c.req.valid("param");
      await deleteWallet(repo, { id, userId: user.id });
      return c.body(null, 204);
    },
  );
