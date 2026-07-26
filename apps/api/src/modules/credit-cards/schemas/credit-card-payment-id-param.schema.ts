import * as z from "zod";

export const creditCardPaymentIdParamSchema = z.object({
  id: z.string().min(1),
});
