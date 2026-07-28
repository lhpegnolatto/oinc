import * as z from "zod";
import {
  investmentColorSchema,
  investmentIconSchema,
} from "../../../shared/validation/investment-appearance";

// Every field is independently optional — a user can update any combination
// of name/currentValue/quantity/costBasis/color/icon, no field requires
// another to also be present (design.md Goals; unlike wallet's update, which
// always requires `name`).
export const updateInvestmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  currentValue: z.number().finite().optional(),
  quantity: z.number().finite().optional(),
  costBasis: z.number().finite().optional(),
  color: investmentColorSchema.optional(),
  icon: investmentIconSchema.optional(),
});

export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
