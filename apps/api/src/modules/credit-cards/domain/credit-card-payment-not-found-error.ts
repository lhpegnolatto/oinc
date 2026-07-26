import { NotFoundError } from "../../../shared/errors";

// Thrown for both "no payment with this id" and "payment belongs to another
// user" — same not-found-obscures-existence rationale as
// CreditCardNotFoundError.
export class CreditCardPaymentNotFoundError extends NotFoundError {
  constructor() {
    super("CREDIT_CARD_PAYMENT_NOT_FOUND", "Credit card payment not found");
  }
}
