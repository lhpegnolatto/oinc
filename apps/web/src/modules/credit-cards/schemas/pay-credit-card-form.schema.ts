import * as z from "zod";

export const payCreditCardFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  walletId: z.string().min(1, "Wallet is required"),
  date: z.string().min(1, "Date is required"),
  note: z.string().trim().optional(),
});

export type PayCreditCardFormValues = z.infer<typeof payCreditCardFormSchema>;
