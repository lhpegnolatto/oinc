import { NotFoundError } from "../../../shared/errors";

// Thrown for both "no investment with this id" and "investment belongs to
// another user" — the two cases are indistinguishable in the response on
// purpose, so a cross-user id probe can't confirm the id exists (mirrors
// WalletNotFoundError).
export class InvestmentNotFoundError extends NotFoundError {
  constructor() {
    super("INVESTMENT_NOT_FOUND", "Investment not found");
  }
}
