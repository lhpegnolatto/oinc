import { WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CreateWalletDialog } from "./create-wallet-dialog";

export function WalletEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WalletIcon />
        </EmptyMedia>
        <EmptyTitle>No wallets yet</EmptyTitle>
        <EmptyDescription>
          Create your first wallet to start tracking your net worth.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateWalletDialog trigger={<Button>Create wallet</Button>} />
      </EmptyContent>
    </Empty>
  );
}
