import { formatCurrency } from "@/lib/format-currency";

export function NetWorthSummary({
  netWorth,
  walletsTotal,
  investmentsTotal,
  cardsTotal,
}: {
  netWorth: number;
  walletsTotal: number;
  investmentsTotal: number;
  cardsTotal: number;
}) {
  return (
    <div data-testid="net-worth-summary" className="flex flex-col gap-3">
      <div>
        <p className="text-sm text-muted-foreground">Net worth</p>
        <p data-testid="net-worth-headline" className="text-3xl font-semibold">
          {formatCurrency(netWorth)}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Wallets</p>
          <p className="text-sm font-medium">{formatCurrency(walletsTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Investments</p>
          <p className="text-sm font-medium">
            {formatCurrency(investmentsTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Card balances</p>
          <p className="text-sm font-medium">{formatCurrency(cardsTotal)}</p>
        </div>
      </div>
    </div>
  );
}
