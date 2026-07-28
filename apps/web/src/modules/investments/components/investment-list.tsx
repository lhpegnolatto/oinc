import type { InvestmentDto } from "../api";
import { InvestmentCard } from "./investment-card";

export function InvestmentList({
  investments,
}: {
  investments: InvestmentDto[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {investments.map((investment) => (
        <InvestmentCard key={investment.id} investment={investment} />
      ))}
    </div>
  );
}
