import { CreditCardNotFoundError } from "../domain/credit-card-not-found-error";
import { WalletNotFoundError } from "../domain/wallet-not-found-error";
import type { CreditCardPaymentsRepository } from "../repositories/credit-card-payments-repository";

export async function createCreditCardPayment(
  repo: CreditCardPaymentsRepository,
  input: {
    userId: string;
    cardId: string;
    walletId: string;
    amount: number;
    date: string;
    note: string | null;
  },
) {
  const result = await repo.createWithBalanceUpdate({
    id: crypto.randomUUID(),
    ...input,
  });
  if (result.kind === "card_not_found") {
    throw new CreditCardNotFoundError();
  }
  if (result.kind === "wallet_not_found") {
    throw new WalletNotFoundError();
  }
  return result.payment;
}
