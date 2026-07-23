import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Optimistic check only: a signed cookie being present doesn't mean the
// session is still valid — (private)/layout.tsx does the authoritative
// check. This never authorizes rendering by itself, it only redirects early
// for the common "definitely signed out" case without a network round trip.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

// Extend this matcher as new (private)/ routes are added — the layout's
// authoritative check still guards any route missed here, just without the
// cheap early redirect.
export const config = {
  matcher: ["/dashboard/:path*"],
};
