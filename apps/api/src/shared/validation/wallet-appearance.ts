import * as z from "zod";
import { colorSchema, DEFAULT_COLOR } from "./appearance";

// Fixed, hand-picked set — independent of whatever Lucide ships in a given
// version, so a future Lucide upgrade can't silently invalidate stored
// wallet.icon values. Shared with apps/web for both validation and rendering.
export const WALLET_ICON_KEYS = [
  "wallet",
  "piggy-bank",
  "landmark",
  "banknote",
  "credit-card",
  "coins",
  "building",
  "building-2",
  "wallet-cards",
  "vault",
  "hand-coins",
  "circle-dollar-sign",
  "receipt",
  "gem",
  "trending-up",
  "briefcase",
  "shopping-bag",
  "shopping-cart",
  "gift",
  "car",
  "house",
  "plane",
  "graduation-cap",
  "heart-pulse",
  "utensils",
  "wine",
  "shirt",
  "bitcoin",
  "chart-line",
  "target",
] as const;

export type WalletIconKey = (typeof WALLET_ICON_KEYS)[number];

export const walletIconSchema = z.enum(WALLET_ICON_KEYS);

export const walletColorSchema = colorSchema;

export const DEFAULT_WALLET_COLOR = DEFAULT_COLOR;
export const DEFAULT_WALLET_ICON: WalletIconKey = "wallet";
