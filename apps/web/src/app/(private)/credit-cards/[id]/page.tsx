import { headers as nextHeaders } from "next/headers";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { CreditCardDetailPage } from "@/modules/credit-cards/credit-card-detail-page";

// Server-side existence/ownership check so a missing or another user's card
// id renders Next's not-found UI (notFound() isn't reliable from a Client
// Component) — actual data rendering below is still client-fetched,
// consistent with how the rest of apps/web reads via TanStack Query hooks.
// Mirrors app/(private)/wallets/[id]/page.tsx.
async function creditCardExists(id: string) {
  const incomingHeaders = await nextHeaders();
  const cookie = incomingHeaders.get("cookie");
  if (!cookie) return false;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/credit-cards`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return false;

    const cards: { id: string }[] = await res.json();
    return cards.some((card) => card.id === id);
  } catch {
    return false;
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await creditCardExists(id))) {
    notFound();
  }

  return <CreditCardDetailPage cardId={id} />;
}
