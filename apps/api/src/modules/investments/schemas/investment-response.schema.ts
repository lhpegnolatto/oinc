import type { Investment } from "../domain/investment";

export function toInvestmentResponse(investment: Investment) {
  const gainLoss =
    investment.costBasis != null
      ? investment.currentValue - investment.costBasis
      : null;

  return {
    id: investment.id,
    name: investment.name,
    quantity: investment.quantity,
    costBasis: investment.costBasis,
    currentValue: investment.currentValue,
    gainLoss,
    color: investment.color,
    icon: investment.icon,
    createdAt: investment.createdAt.toISOString(),
    updatedAt: investment.updatedAt.toISOString(),
  };
}

export type InvestmentResponse = ReturnType<typeof toInvestmentResponse>;
