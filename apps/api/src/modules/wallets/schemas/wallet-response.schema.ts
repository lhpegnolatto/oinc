import type { Wallet } from "../domain/wallet";

export function toWalletResponse(wallet: Wallet) {
  return {
    id: wallet.id,
    name: wallet.name,
    balance: wallet.balance,
    color: wallet.color,
    icon: wallet.icon,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export type WalletResponse = ReturnType<typeof toWalletResponse>;
