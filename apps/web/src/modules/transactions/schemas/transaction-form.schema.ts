import * as z from "zod";

// View-only form shape — API request/response types come from AppType (see
// api.ts), this only shapes what the form itself collects and validates.
export const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  walletId: z.string().min(1, "Wallet is required"),
  date: z.string().min(1, "Date is required"),
  note: z.string().trim().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
