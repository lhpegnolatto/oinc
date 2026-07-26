import * as z from "zod";

// A transactions-module-local twin of
// credit-cards/schemas/credit-card-id-param.schema.ts — kept local per the
// module-independence policy (schemas aren't shared across modules any more
// than repositories/commands/domain are).
export const cardIdParamSchema = z.object({
  cardId: z.string().min(1),
});
