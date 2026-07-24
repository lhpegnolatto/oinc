import * as z from "zod";

export const walletIdParamSchema = z.object({
  id: z.string().min(1),
});
