import type { InvestmentIconKey } from "@oinc/api/investment-appearance";
import type { LucideIcon } from "lucide-react";
import { WALLET_ICON_COMPONENTS } from "@/modules/wallets/lib/wallet-icons";

// Reuses wallet's curated icon set directly — InvestmentIconKey is a type
// alias of WalletIconKey (see @oinc/api/investment-appearance), and both
// domains render the same way (icon-in-a-tinted-circle). See design.md
// Decision 3.
export const INVESTMENT_ICON_COMPONENTS: Record<InvestmentIconKey, LucideIcon> =
  WALLET_ICON_COMPONENTS;
