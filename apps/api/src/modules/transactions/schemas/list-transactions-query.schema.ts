import * as z from "zod";

export const listTransactionsQuerySchema = z.object({
  walletId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]).optional(),
  dateFrom: z.iso.date("Must be a valid date (YYYY-MM-DD)").optional(),
  dateTo: z.iso.date("Must be a valid date (YYYY-MM-DD)").optional(),
  noteSearch: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
