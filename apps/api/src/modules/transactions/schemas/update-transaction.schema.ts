import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// A full resubmission of the editable transaction state (mirrors
// EditWalletDialog's pattern of always sending the whole form), not a
// partial PATCH — walletId is included here since moving a transaction to a
// different wallet the user owns is one of this endpoint's scenarios.
export const updateTransactionSchema = z.object({
  walletId: z.string().min(1, "Wallet is required"),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.iso.date("Must be a valid date (YYYY-MM-DD)"),
  note: noteSchema,
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
