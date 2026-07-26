import * as z from "zod";

const noteSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// No `type` field — a charge is always `expense` (design.md Decision 3).
// `count` > 1 splits the charge into that many monthly installments (design.md
// Decision 2) — 1 (the default) is a regular, non-installment charge.
export const createCardChargeSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.iso.date("Must be a valid date (YYYY-MM-DD)"),
  note: noteSchema,
  status: z.enum(["pending", "posted"]).default("posted"),
  count: z.number().int().min(1).default(1),
});

export type CreateCardChargeInput = z.infer<typeof createCardChargeSchema>;
