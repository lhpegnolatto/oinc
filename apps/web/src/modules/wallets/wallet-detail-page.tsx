"use client";

import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format-currency";
import { QuickAddTransactionSheet } from "@/modules/transactions/components/quick-add-transaction-sheet";
import { TransactionList } from "@/modules/transactions/components/transaction-list";
import { TransactionsEmptyState } from "@/modules/transactions/components/transactions-empty-state";
import { useWalletTransactionsQuery } from "@/modules/transactions/hooks/use-wallet-transactions-query";
import { useWalletsQuery } from "./hooks/use-wallets-query";
import { WALLET_ICON_COMPONENTS } from "./lib/wallet-icons";

// Existence (404 vs found) is already gated server-side by
// app/(private)/wallets/[id]/page.tsx before this renders — this only
// covers the loading state between that gate and the client query
// resolving, and normal client-side data display from here on.
export function WalletDetailPage({ walletId }: { walletId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const { data: wallets, isPending: walletPending } = useWalletsQuery();
  const { data: transactions, isPending: transactionsPending } =
    useWalletTransactionsQuery(walletId);
  const wallet = wallets?.find((w) => w.id === walletId);

  if (walletPending || !wallet) {
    return <Skeleton className="h-24 w-full" />;
  }

  const Icon = WALLET_ICON_COMPONENTS[wallet.icon as WalletIconKey];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          data-testid="wallet-appearance"
          data-icon={wallet.icon}
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: wallet.color }}
        >
          <Icon className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{wallet.name}</h1>
          <p className="text-muted-foreground">
            {formatCurrency(wallet.balance)}
          </p>
        </div>
      </div>

      {transactionsPending ? (
        <Skeleton className="h-24 w-full" />
      ) : transactions && transactions.length > 0 ? (
        <TransactionList transactions={transactions} />
      ) : (
        <TransactionsEmptyState onAdd={() => setAddOpen(true)} />
      )}

      <QuickAddTransactionSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultWalletId={walletId}
      />
    </div>
  );
}
