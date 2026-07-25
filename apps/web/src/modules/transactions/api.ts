import type { CategoryIconKey } from "@oinc/api/category-appearance";
import type { InferResponseType } from "hono/client";
import { apiClient } from "@/lib/api-client";

const categoriesApi = apiClient.categories;
const transactionsApi = apiClient.wallets[":walletId"].transactions;
const transactionApi = apiClient.transactions;
const allTransactionsApi = apiClient.transactions;

export type CategoryDto = InferResponseType<typeof categoriesApi.$get>[number];
export type TransactionDto = InferResponseType<
  (typeof apiClient.wallets)[":walletId"]["transactions"]["$get"]
>[number];
export type TransactionWithWalletDto = InferResponseType<
  typeof allTransactionsApi.$get
>[number];

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function fetchCategories() {
  const res = await categoriesApi.$get();
  return parseOrThrow<CategoryDto[]>(res);
}

export async function createCategoryRequest(input: {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: CategoryIconKey;
}) {
  const res = await categoriesApi.$post({ json: input });
  return parseOrThrow<CategoryDto>(res);
}

export async function fetchWalletTransactions(walletId: string) {
  const res = await transactionsApi.$get({ param: { walletId } });
  return parseOrThrow<TransactionDto[]>(res);
}

export async function createTransactionRequest(
  walletId: string,
  input: {
    type: "income" | "expense";
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
  },
) {
  const res = await transactionsApi.$post({
    param: { walletId },
    json: input,
  });
  return parseOrThrow<TransactionDto>(res);
}

export async function updateTransactionRequest(
  id: string,
  input: {
    walletId: string;
    type: "income" | "expense";
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
  },
) {
  const res = await transactionApi[":id"].$patch({
    param: { id },
    json: input,
  });
  return parseOrThrow<TransactionDto>(res);
}

export async function deleteTransactionRequest(id: string) {
  const res = await transactionApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}

export type TransactionFilters = {
  walletId?: string;
  categoryId?: string;
  type?: "income" | "expense";
  dateFrom?: string;
  dateTo?: string;
  noteSearch?: string;
};

export async function fetchAllTransactions(filters: TransactionFilters) {
  const query = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  );
  const res = await allTransactionsApi.$get({ query });
  return parseOrThrow<TransactionWithWalletDto[]>(res);
}

export async function updateCategoryRequest(
  id: string,
  input: { name: string; color: string; icon: CategoryIconKey },
) {
  const res = await categoriesApi[":id"].$patch({
    param: { id },
    json: input,
  });
  return parseOrThrow<CategoryDto>(res);
}

export async function deleteCategoryRequest(id: string) {
  const res = await categoriesApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}
