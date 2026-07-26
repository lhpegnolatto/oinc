import { NotFoundError } from "../../../shared/errors";

// A credit-cards-module-local twin of
// wallets/domain/wallet-not-found-error.ts — module independence
// (backend.md) means this module reaches directly into the shared `wallet`
// table for ownership/locking when paying a card, but never imports the
// wallets module's own domain/repositories/commands.
export class WalletNotFoundError extends NotFoundError {
  constructor() {
    super("WALLET_NOT_FOUND", "Wallet not found");
  }
}
