import { TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CreateInvestmentDialog } from "./create-investment-dialog";

export function InvestmentEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TrendingUpIcon />
        </EmptyMedia>
        <EmptyTitle>No holdings yet</EmptyTitle>
        <EmptyDescription>
          Create your first holding to start tracking what you own outside of
          cash.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateInvestmentDialog trigger={<Button>Create holding</Button>} />
      </EmptyContent>
    </Empty>
  );
}
