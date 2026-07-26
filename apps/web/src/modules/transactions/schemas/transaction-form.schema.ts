import * as z from "zod";

// View-only form shape — API request/response types come from AppType (see
// api.ts), this only shapes what the form itself collects and validates.
// `destination` picks which mutation submit calls (wallet vs. credit card);
// `status`/`count` are only meaningful for a credit card destination (design.md
// Decision 1/2).
export const transactionFormSchema = z
  .object({
    destination: z.enum(["wallet", "creditCard"]),
    type: z.enum(["income", "expense"]),
    amount: z.number().positive("Amount must be greater than 0"),
    categoryId: z.string().min(1, "Category is required"),
    walletId: z.string().optional(),
    cardId: z.string().optional(),
    status: z.enum(["pending", "posted"]),
    count: z.number().int().min(1),
    date: z.string().min(1, "Date is required"),
    note: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.destination === "wallet" && !values.walletId) {
      ctx.addIssue({
        code: "custom",
        message: "Wallet is required",
        path: ["walletId"],
      });
    }
    if (values.destination === "creditCard" && !values.cardId) {
      ctx.addIssue({
        code: "custom",
        message: "Credit card is required",
        path: ["cardId"],
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
