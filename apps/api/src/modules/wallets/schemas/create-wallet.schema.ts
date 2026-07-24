import * as z from "zod";
import {
  DEFAULT_WALLET_COLOR,
  DEFAULT_WALLET_ICON,
  walletColorSchema,
  walletIconSchema,
} from "../../../shared/validation/wallet-appearance";

export const createWalletSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  balance: z.number().finite(),
  color: walletColorSchema.default(DEFAULT_WALLET_COLOR),
  icon: walletIconSchema.default(DEFAULT_WALLET_ICON),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
