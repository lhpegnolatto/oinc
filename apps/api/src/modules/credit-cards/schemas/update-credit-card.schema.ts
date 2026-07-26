import * as z from "zod";
import {
  creditCardColorSchema,
  creditCardIconSchema,
} from "../../../shared/validation/credit-card-appearance";

const dayOfMonthSchema = z
  .number()
  .int("Must be a whole number")
  .min(1, "Must be between 1 and 31")
  .max(31, "Must be between 1 and 31");

export const updateCreditCardSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  statementCloseDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  color: creditCardColorSchema.optional(),
  icon: creditCardIconSchema.optional(),
});

export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>;
