import { ReceiptIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// Distinct from TransactionsEmptyState (the per-wallet page's "log your
// first one" state) — this page needs a second, separate empty state for
// "filters applied but nothing matched", since that's a very different
// situation from having logged nothing at all (tasks.md 4.4).
export function AllTransactionsEmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasActiveFilters) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>No matching transactions</EmptyTitle>
          <EmptyDescription>
            No transactions match these filters.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptIcon />
        </EmptyMedia>
        <EmptyTitle>No transactions yet</EmptyTitle>
        <EmptyDescription>
          Log a transaction on one of your wallets to see it here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
