import { NotFoundError } from "../../../shared/errors";

// Thrown for both "no transaction with this id" and "transaction belongs to
// another user" — indistinguishable in the response on purpose, mirroring
// WalletNotFoundError.
export class TransactionNotFoundError extends NotFoundError {
  constructor() {
    super("TRANSACTION_NOT_FOUND", "Transaction not found");
  }
}
