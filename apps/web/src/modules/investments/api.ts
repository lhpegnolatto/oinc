import type { InvestmentIconKey } from "@oinc/api/investment-appearance";
import type { InferResponseType } from "hono/client";
import { apiClient } from "@/lib/api-client";

const investmentsApi = apiClient.investments;

export type InvestmentDto = InferResponseType<
  typeof investmentsApi.$get
>[number];

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function fetchInvestments() {
  const res = await investmentsApi.$get();
  return parseOrThrow<InvestmentDto[]>(res);
}

export async function createInvestmentRequest(input: {
  name: string;
  currentValue: number;
  quantity?: number;
  costBasis?: number;
  color: string;
  icon: InvestmentIconKey;
}) {
  const res = await investmentsApi.$post({ json: input });
  return parseOrThrow<InvestmentDto>(res);
}

export async function updateInvestmentRequest(
  id: string,
  input: {
    name?: string;
    currentValue?: number;
    quantity?: number;
    costBasis?: number;
    color?: string;
    icon?: InvestmentIconKey;
  },
) {
  const res = await investmentsApi[":id"].$patch({
    param: { id },
    json: input,
  });
  return parseOrThrow<InvestmentDto>(res);
}

export async function deleteInvestmentRequest(id: string) {
  const res = await investmentsApi[":id"].$delete({ param: { id } });
  if (!res.ok) throw await res.json();
}
