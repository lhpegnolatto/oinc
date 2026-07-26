import * as z from "zod";
import {
  creditCardColorSchema,
  creditCardIconSchema,
  DEFAULT_CREDIT_CARD_COLOR,
  DEFAULT_CREDIT_CARD_ICON,
} from "../../../shared/validation/credit-card-appearance";

const dayOfMonthSchema = z
  .number()
  .int("Must be a whole number")
  .min(1, "Must be between 1 and 31")
  .max(31, "Must be between 1 and 31");

export const createCreditCardSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  balance: z.number().finite(),
  statementCloseDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  color: creditCardColorSchema.default(DEFAULT_CREDIT_CARD_COLOR),
  icon: creditCardIconSchema.default(DEFAULT_CREDIT_CARD_ICON),
});

export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>;
