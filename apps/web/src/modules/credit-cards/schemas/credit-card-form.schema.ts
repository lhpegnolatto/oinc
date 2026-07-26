import {
  creditCardColorSchema,
  creditCardIconSchema,
} from "@oinc/api/credit-card-appearance";
import * as z from "zod";

const dayOfMonthSchema = z
  .number()
  .int("Must be a whole number")
  .min(1, "Must be between 1 and 31")
  .max(31, "Must be between 1 and 31");

// View-only form shape — API request/response types come from AppType (see
// api.ts), this only shapes what the form itself collects and validates.
export const createCreditCardFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  balance: z.number().finite("Enter a valid number"),
  statementCloseDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  color: creditCardColorSchema,
  icon: creditCardIconSchema,
});

export type CreateCreditCardFormValues = z.infer<
  typeof createCreditCardFormSchema
>;

export const editCreditCardFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  statementCloseDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  color: creditCardColorSchema,
  icon: creditCardIconSchema,
});

export type EditCreditCardFormValues = z.infer<typeof editCreditCardFormSchema>;
