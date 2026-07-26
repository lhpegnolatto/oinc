import { HandCoinsIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function PaymentEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HandCoinsIcon />
        </EmptyMedia>
        <EmptyTitle>No payments yet</EmptyTitle>
        <EmptyDescription>
          Payments you make against this card will show up here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
