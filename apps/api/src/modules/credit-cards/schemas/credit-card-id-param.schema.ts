import * as z from "zod";

export const creditCardIdParamSchema = z.object({
  id: z.string().min(1),
});
