import { headers as nextHeaders } from "next/headers";
import { env } from "@/env";

export interface SessionUser {
  name: string;
  email: string;
  image: string | null;
}

interface Session {
  user: SessionUser;
}

async function fetchSession(): Promise<Session | null> {
  const incomingHeaders = await nextHeaders();
  const cookie = incomingHeaders.get("cookie");
  if (!cookie) return null;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const session = await res.json();
    if (!session?.user) return null;
    return { user: session.user };
  } catch {
    // apps/api unreachable — treat as unauthenticated rather than crashing.
    return null;
  }
}

export async function hasValidSession(): Promise<boolean> {
  return (await fetchSession()) !== null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await fetchSession();
  return session?.user ?? null;
}
