import { NotFoundError } from "../../../shared/errors";

// A transactions-module-local twin of wallets/domain/wallet-not-found-error.ts
// — module independence (backend.md) means this module reads the shared
// `wallet` table directly for ownership/locking but never imports the
// wallets module's own domain/repositories/commands, so this error type
// isn't shared either.
export class WalletNotFoundError extends NotFoundError {
  constructor() {
    super("WALLET_NOT_FOUND", "Wallet not found");
  }
}
