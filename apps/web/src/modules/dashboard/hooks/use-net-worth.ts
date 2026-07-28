"use client";

import { useMemo } from "react";
import { useCreditCardsQuery } from "@/modules/credit-cards/hooks/use-credit-cards-query";
import { useInvestmentsQuery } from "@/modules/investments/hooks/use-investments-query";
import { useWalletsQuery } from "@/modules/wallets/hooks/use-wallets-query";

export function useNetWorth() {
  const { data: wallets, isPending: walletsPending } = useWalletsQuery();
  const { data: cards, isPending: cardsPending } = useCreditCardsQuery();
  const { data: investments, isPending: investmentsPending } =
    useInvestmentsQuery();

  const totals = useMemo(() => {
    const walletsTotal = (wallets ?? []).reduce(
      (sum, wallet) => sum + wallet.balance,
      0,
    );
    const investmentsTotal = (investments ?? []).reduce(
      (sum, investment) => sum + investment.currentValue,
      0,
    );
    const cardsTotal = (cards ?? []).reduce(
      (sum, card) => sum + card.balance,
      0,
    );

    return {
      walletsTotal,
      investmentsTotal,
      cardsTotal,
      netWorth: walletsTotal + investmentsTotal - cardsTotal,
    };
  }, [wallets, investments, cards]);

  return {
    ...totals,
    isPending: walletsPending || cardsPending || investmentsPending,
  };
}
