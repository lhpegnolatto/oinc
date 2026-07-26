"use client";

import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format-currency";
import { useQuickAddTransaction } from "@/modules/transactions/components/quick-add-transaction-provider";
import { ChargeEmptyState } from "./components/charge-empty-state";
import { ChargeList } from "./components/charge-list";
import { PayCreditCardSheet } from "./components/pay-credit-card-sheet";
import { PaymentEmptyState } from "./components/payment-empty-state";
import { PaymentList } from "./components/payment-list";
import { useCardChargesQuery } from "./hooks/use-card-charges-query";
import { useCardPaymentsQuery } from "./hooks/use-card-payments-query";
import { useCreditCardsQuery } from "./hooks/use-credit-cards-query";
import { CREDIT_CARD_ICON_COMPONENTS } from "./lib/credit-card-icons";

// Existence (404 vs found) is already gated server-side by
// app/(private)/credit-cards/[id]/page.tsx before this renders — this only
// covers the loading state between that gate and the client query
// resolving, and normal client-side data display from here on.
export function CreditCardDetailPage({ cardId }: { cardId: string }) {
  const { open } = useQuickAddTransaction();
  const [payOpen, setPayOpen] = useState(false);
  const { data: cards, isPending: cardPending } = useCreditCardsQuery();
  const { data: charges, isPending: chargesPending } =
    useCardChargesQuery(cardId);
  const { data: payments, isPending: paymentsPending } =
    useCardPaymentsQuery(cardId);
  const card = cards?.find((c) => c.id === cardId);

  if (cardPending || !card) {
    return <Skeleton className="h-24 w-full" />;
  }

  const Icon = CREDIT_CARD_ICON_COMPONENTS[card.icon as CreditCardIconKey];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            data-testid="credit-card-appearance"
            data-icon={card.icon}
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: card.color }}
          >
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{card.name}</h1>
            <p className="text-muted-foreground">
              {formatCurrency(card.balance)} owed ·{" "}
              {formatCurrency(card.statement.total)} due on{" "}
              {card.statement.dueDate}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPayOpen(true)}>
            Pay card
          </Button>
          <Button onClick={open}>Log charge</Button>
        </div>
      </div>

      {chargesPending ? (
        <Skeleton className="h-24 w-full" />
      ) : charges && charges.length > 0 ? (
        <ChargeList charges={charges} />
      ) : (
        <ChargeEmptyState onAdd={open} />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Payments</h2>
        {paymentsPending ? (
          <Skeleton className="h-24 w-full" />
        ) : payments && payments.length > 0 ? (
          <PaymentList payments={payments} />
        ) : (
          <PaymentEmptyState />
        )}
      </div>

      <PayCreditCardSheet
        card={card}
        open={payOpen}
        onOpenChange={setPayOpen}
      />
    </div>
  );
}
