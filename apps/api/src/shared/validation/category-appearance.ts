import * as z from "zod";
import { colorSchema } from "./appearance";

// Fixed, hand-picked set — its own vocabulary distinct from
// WALLET_ICON_KEYS, even though the color validation is shared. Independent
// of whatever Lucide ships in a given version, so a future Lucide upgrade
// can't silently invalidate stored category.icon values.
export const CATEGORY_ICON_KEYS = [
  "utensils",
  "shopping-cart",
  "shopping-bag",
  "car",
  "house",
  "receipt",
  "heart-pulse",
  "graduation-cap",
  "plane",
  "gamepad-2",
  "film",
  "gift",
  "wine",
  "shirt",
  "dumbbell",
  "dog",
  "baby",
  "wrench",
  "phone",
  "wifi",
  "fuel",
  "bus",
  "briefcase",
  "banknote",
  "trending-up",
  "hand-coins",
  "piggy-bank",
  "coins",
  "circle-dollar-sign",
  "landmark",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const categoryIconSchema = z.enum(CATEGORY_ICON_KEYS);

export const categoryColorSchema = colorSchema;

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "receipt";
