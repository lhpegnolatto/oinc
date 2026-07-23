import { headers as nextHeaders } from "next/headers";
import { env } from "@/env";

export async function hasValidSession(): Promise<boolean> {
  const incomingHeaders = await nextHeaders();
  const cookie = incomingHeaders.get("cookie");
  if (!cookie) return false;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return false;

    const session = await res.json();
    return Boolean(session?.user);
  } catch {
    // apps/api unreachable — treat as unauthenticated rather than crashing.
    return false;
  }
}
