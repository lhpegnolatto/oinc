import * as z from "zod";

// Domain-agnostic: shared by wallet and category appearance (see
// wallet-appearance.ts / category-appearance.ts), each of which only adds its
// own curated icon vocabulary on top of this.
export const COLOR_HEX_REGEX = /^#[0-9a-f]{6}$/i;

export const colorSchema = z
  .string()
  .regex(COLOR_HEX_REGEX, "Must be a valid hex color, e.g. #22c55e")
  .transform((value) => value.toLowerCase());

export const DEFAULT_COLOR = "#71717a";
