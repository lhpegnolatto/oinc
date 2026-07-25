import { ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function TransactionsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptIcon />
        </EmptyMedia>
        <EmptyTitle>No transactions yet</EmptyTitle>
        <EmptyDescription>
          Log your first transaction to start tracking this wallet.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onAdd}>Log transaction</Button>
      </EmptyContent>
    </Empty>
  );
}
