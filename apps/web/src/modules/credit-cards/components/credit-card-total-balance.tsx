import { formatCurrency } from "@/lib/format-currency";
import type { CreditCardDto } from "../api";

export function CreditCardTotalBalance({ cards }: { cards: CreditCardDto[] }) {
  const total = cards.reduce((sum, card) => sum + card.balance, 0);

  return (
    <div>
      <p className="text-sm text-muted-foreground">Total owed</p>
      <p className="text-3xl font-semibold">{formatCurrency(total)}</p>
    </div>
  );
}
