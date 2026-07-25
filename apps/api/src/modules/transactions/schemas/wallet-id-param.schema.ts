import * as z from "zod";

// A transactions-module-local twin of wallets/schemas/wallet-id-param.schema.ts
// — kept local per the module-independence policy (schemas aren't shared
// across modules any more than repositories/commands/domain are).
export const walletIdParamSchema = z.object({
  walletId: z.string().min(1),
});
