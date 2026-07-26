import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-currency";
import type { CreditCardDto } from "../api";
import { CREDIT_CARD_ICON_COMPONENTS } from "../lib/credit-card-icons";
import { DeleteCreditCardDialog } from "./delete-credit-card-dialog";
import { EditCreditCardDialog } from "./edit-credit-card-dialog";

export function CreditCardCard({ card }: { card: CreditCardDto }) {
  const Icon = CREDIT_CARD_ICON_COMPONENTS[card.icon as CreditCardIconKey];

  return (
    <Card>
      <CardHeader>
        <Link
          href={`/credit-cards/${card.id}`}
          className="flex items-center gap-2.5"
        >
          <div
            data-testid="credit-card-appearance"
            data-icon={card.icon}
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: card.color }}
          >
            <Icon className="size-4 text-white" />
          </div>
          <CardTitle>{card.name}</CardTitle>
        </Link>
        <CardAction className="flex gap-1">
          <EditCreditCardDialog card={card} />
          <DeleteCreditCardDialog card={card} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Link href={`/credit-cards/${card.id}`}>
          <p className="text-2xl font-semibold">
            {formatCurrency(card.balance)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(card.statement.total)} due on{" "}
            {card.statement.dueDate}
          </p>
        </Link>
      </CardContent>
    </Card>
  );
}
