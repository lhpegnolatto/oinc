import type { CreditCardPayment } from "../domain/credit-card-payment";

export function toCreditCardPaymentResponse(payment: CreditCardPayment) {
  return {
    id: payment.id,
    cardId: payment.cardId,
    walletId: payment.walletId,
    amount: payment.amount,
    date: payment.date,
    note: payment.note,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export type CreditCardPaymentResponse = ReturnType<
  typeof toCreditCardPaymentResponse
>;
