import { colorSchema, DEFAULT_COLOR } from "./appearance";
// Reuses wallet's curated icon vocabulary rather than curating a second one —
// no card-network-logo requirement in scope, and both domains render the
// same way (icon-in-a-tinted-circle). See design.md Decision 5.
import {
  DEFAULT_WALLET_ICON,
  WALLET_ICON_KEYS,
  type WalletIconKey,
  walletIconSchema,
} from "./wallet-appearance";

export const CREDIT_CARD_ICON_KEYS = WALLET_ICON_KEYS;
export type CreditCardIconKey = WalletIconKey;

export const creditCardIconSchema = walletIconSchema;
export const creditCardColorSchema = colorSchema;

export const DEFAULT_CREDIT_CARD_COLOR = DEFAULT_COLOR;
export const DEFAULT_CREDIT_CARD_ICON: CreditCardIconKey = DEFAULT_WALLET_ICON;
