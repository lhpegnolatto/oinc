"use client";

import { PlusIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { QuickAddTransactionSheet } from "./quick-add-transaction-sheet";

const WALLET_PAGE_PATTERN = /^\/wallets\/([^/]+)$/;

// Rendered once in the private shell (site-header) — owns the sheet's open
// state so both the visible button and the global "n" shortcut can open the
// same sheet instance, pre-filled with the current wallet when on
// /wallets/[id].
export function QuickAddTransactionTrigger() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const walletMatch = pathname.match(WALLET_PAGE_PATTERN);
  const defaultWalletId = walletMatch?.[1];

  useKeyboardShortcut("n", () => setOpen(true));

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Add transaction
      </Button>
      <QuickAddTransactionSheet
        open={open}
        onOpenChange={setOpen}
        defaultWalletId={defaultWalletId}
      />
    </>
  );
}
