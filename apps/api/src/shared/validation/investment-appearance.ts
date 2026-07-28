import { colorSchema, DEFAULT_COLOR } from "./appearance";
// Reuses wallet's curated icon vocabulary rather than curating a second one —
// it already includes investment-flavored icons (trending-up, chart-line,
// bitcoin, gem, landmark, coins). See design.md Decision 3.
import {
  DEFAULT_WALLET_ICON,
  WALLET_ICON_KEYS,
  type WalletIconKey,
  walletIconSchema,
} from "./wallet-appearance";

export const INVESTMENT_ICON_KEYS = WALLET_ICON_KEYS;
export type InvestmentIconKey = WalletIconKey;

export const investmentIconSchema = walletIconSchema;
export const investmentColorSchema = colorSchema;

export const DEFAULT_INVESTMENT_COLOR = DEFAULT_COLOR;
export const DEFAULT_INVESTMENT_ICON: InvestmentIconKey = DEFAULT_WALLET_ICON;
