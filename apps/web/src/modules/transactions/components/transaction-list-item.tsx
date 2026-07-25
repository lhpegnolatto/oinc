"use client";

import type { CategoryIconKey } from "@oinc/api/category-appearance";
import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { WALLET_ICON_COMPONENTS } from "@/modules/wallets/lib/wallet-icons";
import type { TransactionDto, TransactionWithWalletDto } from "../api";
import { useCategoriesQuery } from "../hooks/use-categories-query";
import { CATEGORY_ICON_COMPONENTS } from "../lib/category-icons";
import { EditTransactionSheet } from "./edit-transaction-sheet";

// Accepts either the wallet-scoped shape (per-wallet list on
// /wallets/[id], no wallet field since it's implicit there) or the
// all-wallets shape (/transactions, which needs the wallet badge below to
// serve the "did I log this on the wrong wallet" review case).
export function TransactionListItem({
  transaction,
}: {
  transaction: TransactionDto | TransactionWithWalletDto;
}) {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategoriesQuery();
  const category = categories?.find((c) => c.id === transaction.categoryId);
  const Icon = category
    ? CATEGORY_ICON_COMPONENTS[category.icon as CategoryIconKey]
    : undefined;
  const isIncome = transaction.type === "income";
  const wallet = "wallet" in transaction ? transaction.wallet : undefined;
  const WalletIcon = wallet
    ? WALLET_ICON_COMPONENTS[wallet.icon as WalletIconKey]
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
      >
        <div
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: category?.color ?? "#71717a" }}
        >
          {Icon && <Icon className="size-4 text-white" />}
          {wallet && WalletIcon && (
            <span
              title={wallet.name}
              className="absolute -right-1 -bottom-1 flex size-4 shrink-0 items-center justify-center rounded-full ring-2 ring-background"
              style={{ backgroundColor: wallet.color }}
            >
              <WalletIcon className="size-2.5 text-white" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-medium">
            {category?.name ?? "Uncategorized"}
          </span>
          <span className="text-xs text-muted-foreground">
            {transaction.date}
            {transaction.note ? ` · ${transaction.note}` : ""}
          </span>
        </div>
        <span
          className={
            isIncome
              ? "font-medium text-green-600 dark:text-green-500"
              : "font-medium"
          }
        >
          {isIncome ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </span>
      </button>
      <EditTransactionSheet
        transaction={transaction}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
