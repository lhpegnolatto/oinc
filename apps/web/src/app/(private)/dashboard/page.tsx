import { WalletIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">Nothing here yet.</p>
      <Link href="/wallets" className={buttonVariants({ className: "w-fit" })}>
        <WalletIcon data-icon="inline-start" />
        Wallets
      </Link>
    </div>
  );
}
