import { HandCoinsIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import type { CreditCardPaymentDto } from "../api";
import { DeletePaymentDialog } from "./delete-payment-dialog";

export function PaymentListItem({
  payment,
}: {
  payment: CreditCardPaymentDto;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-lg p-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <HandCoinsIcon className="size-4" />
      </div>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">Payment</span>
        <span className="text-xs text-muted-foreground">
          {payment.date}
          {payment.note ? ` · ${payment.note}` : ""}
        </span>
      </div>
      <span className="font-medium">-{formatCurrency(payment.amount)}</span>
      <DeletePaymentDialog payment={payment} />
    </div>
  );
}
