"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateWalletDialog } from "./components/create-wallet-dialog";
import { NetWorthTotal } from "./components/net-worth-total";
import { WalletEmptyState } from "./components/wallet-empty-state";
import { WalletList } from "./components/wallet-list";
import { useWalletsQuery } from "./hooks/use-wallets-query";

export function WalletsPage() {
  const { data: wallets, isPending } = useWalletsQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Wallets</h1>
        <CreateWalletDialog
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add wallet
            </Button>
          }
        />
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : wallets && wallets.length > 0 ? (
        <>
          <NetWorthTotal wallets={wallets} />
          <WalletList wallets={wallets} />
        </>
      ) : (
        <WalletEmptyState />
      )}
    </div>
  );
}
