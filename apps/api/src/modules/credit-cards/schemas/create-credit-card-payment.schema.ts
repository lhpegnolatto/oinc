import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createCreditCardPaymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.iso.date("Must be a valid date (YYYY-MM-DD)"),
  note: noteSchema,
  walletId: z.string().min(1, "Wallet is required"),
});

export type CreateCreditCardPaymentInput = z.infer<
  typeof createCreditCardPaymentSchema
>;
