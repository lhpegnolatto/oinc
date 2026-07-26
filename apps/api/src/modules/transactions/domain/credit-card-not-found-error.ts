import { NotFoundError } from "../../../shared/errors";

// A transactions-module-local twin of
// credit-cards/domain/credit-card-not-found-error.ts — module independence
// (backend.md) means this module reads the shared `credit_card` table
// directly for ownership/locking but never imports the credit-cards module's
// own domain/repositories/commands, so this error type isn't shared either.
export class CreditCardNotFoundError extends NotFoundError {
  constructor() {
    super("CREDIT_CARD_NOT_FOUND", "Credit card not found");
  }
}
