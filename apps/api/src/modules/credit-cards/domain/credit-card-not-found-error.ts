import { NotFoundError } from "../../../shared/errors";

// Thrown for both "no card with this id" and "card belongs to another
// user" — the two cases are indistinguishable in the response on purpose, so
// a cross-user id probe can't confirm the id exists (see design.md).
export class CreditCardNotFoundError extends NotFoundError {
  constructor() {
    super("CREDIT_CARD_NOT_FOUND", "Credit card not found");
  }
}
