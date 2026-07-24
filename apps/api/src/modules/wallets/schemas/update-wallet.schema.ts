import * as z from "zod";
import {
  walletColorSchema,
  walletIconSchema,
} from "../../../shared/validation/wallet-appearance";

export const updateWalletSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: walletColorSchema.optional(),
  icon: walletIconSchema.optional(),
});

export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
