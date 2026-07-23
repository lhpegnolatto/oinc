import { redirect } from "next/navigation";
import { hasValidSession } from "@/lib/session";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await hasValidSession())) {
    redirect("/sign-in");
  }

  return children;
}
