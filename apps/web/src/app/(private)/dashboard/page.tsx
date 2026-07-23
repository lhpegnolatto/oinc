"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-medium">Dashboard</h1>
        <Button
          variant="outline"
          onClick={async () => {
            await authClient.signOut();
            router.push("/sign-in");
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
