import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.iso.date("Must be a valid date (YYYY-MM-DD)"),
  note: noteSchema,
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
