import {
  walletColorSchema,
  walletIconSchema,
} from "@oinc/api/wallet-appearance";
import * as z from "zod";

export const createWalletFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  balance: z.number().finite("Enter a valid number"),
  color: walletColorSchema,
  icon: walletIconSchema,
});

export type CreateWalletFormValues = z.infer<typeof createWalletFormSchema>;

export const editWalletFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: walletColorSchema,
  icon: walletIconSchema,
});

export type EditWalletFormValues = z.infer<typeof editWalletFormSchema>;
