import { formatCurrency } from "@/lib/format-currency";
import type { InvestmentDto } from "../api";

export function InvestmentsTotal({
  investments,
}: {
  investments: InvestmentDto[];
}) {
  const total = investments.reduce(
    (sum, investment) => sum + investment.currentValue,
    0,
  );

  return (
    <div>
      <p className="text-sm text-muted-foreground">Total value</p>
      <p className="text-3xl font-semibold">{formatCurrency(total)}</p>
    </div>
  );
}
