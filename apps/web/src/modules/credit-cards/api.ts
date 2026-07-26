import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
import type { InferResponseType } from "hono/client";
import { apiClient } from "@/lib/api-client";

const creditCardsApi = apiClient["credit-cards"];
const cardChargesApi = apiClient["credit-cards"][":cardId"].charges;
const chargeApi = apiClient.transactions;
const cardPaymentsApi = apiClient["credit-cards"][":cardId"].payments;
const paymentApi = apiClient["credit-card-payments"];

export type CreditCardDto = InferResponseType<
  typeof creditCardsApi.$get
>[number];
export type CardChargeDto = InferResponseType<
  typeof cardChargesApi.$get
>[number];
export type CreditCardPaymentDto = InferResponseType<
  typeof cardPaymentsApi.$get
>[number];

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function fetchCreditCards() {
  const res = await creditCardsApi.$get();
  return parseOrThrow<CreditCardDto[]>(res);
}

export async function createCreditCardRequest(input: {
  name: string;
  balance: number;
  statementCloseDay: number;
  dueDay: number;
  color: string;
  icon: CreditCardIconKey;
}) {
  const res = await creditCardsApi.$post({ json: input });
  return parseOrThrow<CreditCardDto>(res);
}

export async function updateCreditCardRequest(
  id: string,
  input: {
    name: string;
    statementCloseDay: number;
    dueDay: number;
    color: string;
    icon: CreditCardIconKey;
  },
) {
  const res = await creditCardsApi[":id"].$patch({
    param: { id },
    json: input,
  });
  return parseOrThrow<CreditCardDto>(res);
}

export async function deleteCreditCardRequest(id: string) {
  const res = await creditCardsApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}

export async function fetchCardCharges(cardId: string) {
  const res = await cardChargesApi.$get({ param: { cardId } });
  return parseOrThrow<CardChargeDto[]>(res);
}

export async function createCardChargeRequest(
  cardId: string,
  input: {
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
    status: "pending" | "posted";
    // > 1 splits the charge into that many monthly installments — the
    // response is then an array of the created charges instead of one.
    count?: number;
  },
) {
  const res = await cardChargesApi.$post({
    param: { cardId },
    json: input,
  });
  return parseOrThrow<CardChargeDto | CardChargeDto[]>(res);
}

export async function updateCardChargeRequest(
  id: string,
  input: {
    cardId: string;
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
    status: "pending" | "posted";
  },
) {
  const res = await chargeApi[":id"].$patch({
    param: { id },
    json: input,
  });
  return parseOrThrow<CardChargeDto>(res);
}

export async function deleteCardChargeRequest(id: string) {
  const res = await chargeApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}

export async function deleteRemainingInstallmentsRequest(id: string) {
  const res = await chargeApi[":id"]["remaining-installments"].$delete({
    param: { id },
  });
  if (!res.ok) throw await res.json();
}

export async function fetchCardPayments(cardId: string) {
  const res = await cardPaymentsApi.$get({ param: { cardId } });
  return parseOrThrow<CreditCardPaymentDto[]>(res);
}

export async function createCardPaymentRequest(
  cardId: string,
  input: { amount: number; date: string; note?: string; walletId: string },
) {
  const res = await cardPaymentsApi.$post({ param: { cardId }, json: input });
  return parseOrThrow<CreditCardPaymentDto>(res);
}

export async function deleteCardPaymentRequest(id: string) {
  const res = await paymentApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}
