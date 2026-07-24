import type { WalletDto } from "../api";
import { WalletCard } from "./wallet-card";

export function WalletList({ wallets }: { wallets: WalletDto[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} />
      ))}
    </div>
  );
}
