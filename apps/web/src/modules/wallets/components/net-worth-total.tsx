import { formatCurrency } from "@/lib/format-currency";
import type { WalletDto } from "../api";

export function NetWorthTotal({ wallets }: { wallets: WalletDto[] }) {
  const total = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  return (
    <div>
      <p className="text-sm text-muted-foreground">Wallets total</p>
      <p className="text-3xl font-semibold">{formatCurrency(total)}</p>
    </div>
  );
}
