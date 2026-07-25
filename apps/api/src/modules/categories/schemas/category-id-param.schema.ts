import * as z from "zod";

export const categoryIdParamSchema = z.object({
  id: z.string().min(1),
});
