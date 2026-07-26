import * as z from "zod";

export const cardIdParamSchema = z.object({
  cardId: z.string().min(1),
});
