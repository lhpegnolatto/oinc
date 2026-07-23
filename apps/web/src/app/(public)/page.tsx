import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/session";

export default async function RootPage() {
  if (await hasValidSession()) {
    redirect("/dashboard");
  }

  redirect("/sign-in");
}
