import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WalletDto } from "../api";
import { formatCurrency } from "../lib/format-currency";
import { WALLET_ICON_COMPONENTS } from "../lib/wallet-icons";
import { DeleteWalletDialog } from "./delete-wallet-dialog";
import { EditWalletDialog } from "./edit-wallet-dialog";

export function WalletCard({ wallet }: { wallet: WalletDto }) {
  const Icon = WALLET_ICON_COMPONENTS[wallet.icon as WalletIconKey];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div
            data-testid="wallet-appearance"
            data-icon={wallet.icon}
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: wallet.color }}
          >
            <Icon className="size-4 text-white" />
          </div>
          <CardTitle>{wallet.name}</CardTitle>
        </div>
        <CardAction className="flex gap-1">
          <EditWalletDialog wallet={wallet} />
          <DeleteWalletDialog wallet={wallet} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">
          {formatCurrency(wallet.balance)}
        </p>
      </CardContent>
    </Card>
  );
}
