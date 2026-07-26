import { CreditCardPaymentNotFoundError } from "../domain/credit-card-payment-not-found-error";
import type { CreditCardPaymentsRepository } from "../repositories/credit-card-payments-repository";

export async function deleteCreditCardPayment(
  repo: CreditCardPaymentsRepository,
  input: { id: string; userId: string },
) {
  const deleted = await repo.deleteWithBalanceUpdate(input);
  if (!deleted) {
    throw new CreditCardPaymentNotFoundError();
  }
  return deleted;
}
