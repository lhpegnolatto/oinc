"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to Fynn</CardTitle>
          <CardDescription>
            Use your Google account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() =>
              authClient.signIn.social({
                provider: "google",
                // Must be absolute: apps/api owns the OAuth callback and
                // issues the post-sign-in redirect from its own origin, so a
                // relative path here would land the user back on apps/api's
                // origin instead of apps/web's.
                callbackURL: `${window.location.origin}/dashboard`,
              })
            }
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
