import * as z from "zod";
import {
  DEFAULT_INVESTMENT_COLOR,
  DEFAULT_INVESTMENT_ICON,
  investmentColorSchema,
  investmentIconSchema,
} from "../../../shared/validation/investment-appearance";

export const createInvestmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  currentValue: z.number().finite(),
  quantity: z.number().finite().optional(),
  costBasis: z.number().finite().optional(),
  color: investmentColorSchema.default(DEFAULT_INVESTMENT_COLOR),
  icon: investmentIconSchema.default(DEFAULT_INVESTMENT_ICON),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
