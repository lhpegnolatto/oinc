import type { CreditCardDto } from "../api";
import { CreditCardCard } from "./credit-card-card";

export function CreditCardList({ cards }: { cards: CreditCardDto[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <CreditCardCard key={card.id} card={card} />
      ))}
    </div>
  );
}
