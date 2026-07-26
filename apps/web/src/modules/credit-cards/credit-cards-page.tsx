"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCreditCardDialog } from "./components/create-credit-card-dialog";
import { CreditCardEmptyState } from "./components/credit-card-empty-state";
import { CreditCardList } from "./components/credit-card-list";
import { CreditCardTotalBalance } from "./components/credit-card-total-balance";
import { useCreditCardsQuery } from "./hooks/use-credit-cards-query";

export function CreditCardsPage() {
  const { data: cards, isPending } = useCreditCardsQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Credit Cards</h1>
        <CreateCreditCardDialog
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add credit card
            </Button>
          }
        />
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : cards && cards.length > 0 ? (
        <>
          <CreditCardTotalBalance cards={cards} />
          <CreditCardList cards={cards} />
        </>
      ) : (
        <CreditCardEmptyState />
      )}
    </div>
  );
}
