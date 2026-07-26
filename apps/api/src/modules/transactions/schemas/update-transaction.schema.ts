import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// A full resubmission of the editable transaction state (mirrors
// EditWalletDialog's pattern of always sending the whole form), not a
// partial PATCH. Two shapes, discriminated by which destination key is
// present — wallet↔card conversion isn't supported (design.md Non-Goal), so
// each shape only accepts the destination kind it can move within.
const updateWalletTransactionSchema = z.object({
  walletId: z.string().min(1, "Wallet is required"),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.iso.date("Must be a valid date (YYYY-MM-DD)"),
  note: noteSchema,
});

// A charge's type is always expense (design.md Decision 3), so it isn't part
// of this shape at all — unlike a wallet transaction, which can be either.
const updateCardChargeSchema = z.object({
  cardId: z.string().min(1, "Card is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.iso.date("Must be a valid date (YYYY-MM-DD)"),
  note: noteSchema,
  status: z.enum(["pending", "posted"]).default("posted"),
});

export const updateTransactionSchema = z.union([
  updateWalletTransactionSchema,
  updateCardChargeSchema,
]);

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
