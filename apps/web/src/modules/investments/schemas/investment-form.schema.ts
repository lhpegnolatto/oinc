import {
  investmentColorSchema,
  investmentIconSchema,
} from "@oinc/api/investment-appearance";
import * as z from "zod";

export const investmentFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  currentValue: z.number().finite("Enter a valid number"),
  quantity: z.number().finite("Enter a valid number").optional(),
  costBasis: z.number().finite("Enter a valid number").optional(),
  color: investmentColorSchema,
  icon: investmentIconSchema,
});

export type InvestmentFormValues = z.infer<typeof investmentFormSchema>;
