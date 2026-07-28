import * as z from "zod";

export const investmentIdParamSchema = z.object({
  id: z.string().min(1),
});
