import { CreditCardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CreateCreditCardDialog } from "./create-credit-card-dialog";

export function CreditCardEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCardIcon />
        </EmptyMedia>
        <EmptyTitle>No credit cards yet</EmptyTitle>
        <EmptyDescription>
          Create your first credit card to start tracking what you owe.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateCreditCardDialog trigger={<Button>Create credit card</Button>} />
      </EmptyContent>
    </Empty>
  );
}
