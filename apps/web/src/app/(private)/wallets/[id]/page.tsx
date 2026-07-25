import { headers as nextHeaders } from "next/headers";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { WalletDetailPage } from "@/modules/wallets/wallet-detail-page";

// Server-side existence/ownership check so a missing or another user's
// wallet id renders Next's not-found UI (notFound() isn't reliable from a
// Client Component) — actual data rendering below is still client-fetched,
// consistent with how the rest of apps/web reads via TanStack Query hooks.
async function walletExists(id: string) {
  const incomingHeaders = await nextHeaders();
  const cookie = incomingHeaders.get("cookie");
  if (!cookie) return false;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/wallets`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return false;

    const wallets: { id: string }[] = await res.json();
    return wallets.some((wallet) => wallet.id === id);
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
  if (!(await walletExists(id))) {
    notFound();
  }

  return <WalletDetailPage walletId={id} />;
}
