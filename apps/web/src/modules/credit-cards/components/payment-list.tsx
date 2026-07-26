import type { CreditCardPaymentDto } from "../api";
import { PaymentListItem } from "./payment-list-item";

export function PaymentList({
  payments,
}: {
  payments: CreditCardPaymentDto[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {payments.map((payment) => (
        <PaymentListItem key={payment.id} payment={payment} />
      ))}
    </div>
  );
}
