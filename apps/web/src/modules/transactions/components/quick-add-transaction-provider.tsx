"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { QuickAddTransactionSheet } from "./quick-add-transaction-sheet";

const WALLET_PAGE_PATTERN = /^\/wallets\/([^/]+)$/;
const CREDIT_CARD_PAGE_PATTERN = /^\/credit-cards\/([^/]+)$/;

const QuickAddTransactionContext = createContext<{
  open: () => void;
} | null>(null);

export function useQuickAddTransaction() {
  const context = useContext(QuickAddTransactionContext);
  if (!context) {
    throw new Error(
      "useQuickAddTransaction must be used within a QuickAddTransactionProvider",
    );
  }
  return context;
}

// Mounted once in the private shell (app/(private)/layout.tsx) — owns the
// sheet's open state so both a visible "Add transaction" button (anywhere
// under this provider) and the global "n" shortcut open the same sheet
// instance, pre-filled with the current wallet on /wallets/[id] or the
// current credit card on /credit-cards/[id] (design.md Decision 1 — this
// replaced the credit-cards-core-era QuickAddChargeProvider/"c" shortcut).
export function QuickAddTransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const walletMatch = pathname.match(WALLET_PAGE_PATTERN);
  const cardMatch = pathname.match(CREDIT_CARD_PAGE_PATTERN);
  const defaultWalletId = walletMatch?.[1];
  const defaultCardId = cardMatch?.[1];

  useKeyboardShortcut("n", () => setOpen(true));

  return (
    <QuickAddTransactionContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <QuickAddTransactionSheet
        open={open}
        onOpenChange={setOpen}
        defaultWalletId={defaultWalletId}
        defaultCardId={defaultCardId}
      />
    </QuickAddTransactionContext.Provider>
  );
}
