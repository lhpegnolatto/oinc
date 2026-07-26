import * as z from "zod";

// View-only form shape — API request/response types come from AppType (see
// api.ts). No `type` field: a charge is always `expense` (design.md
// Decision 3), unlike a wallet transaction form.
export const cardChargeFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  cardId: z.string().min(1, "Card is required"),
  date: z.string().min(1, "Date is required"),
  note: z.string().trim().optional(),
  status: z.enum(["pending", "posted"]),
});

export type CardChargeFormValues = z.infer<typeof cardChargeFormSchema>;
