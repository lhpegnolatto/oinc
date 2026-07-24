import { NotFoundError } from "../../../shared/errors";

// Thrown for both "no wallet with this id" and "wallet belongs to another
// user" — the two cases are indistinguishable in the response on purpose, so
// a cross-user id probe can't confirm the id exists (see design.md).
export class WalletNotFoundError extends NotFoundError {
  constructor() {
    super("WALLET_NOT_FOUND", "Wallet not found");
  }
}
