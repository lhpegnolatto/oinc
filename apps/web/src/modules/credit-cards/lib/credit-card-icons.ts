import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
import type { LucideIcon } from "lucide-react";
import { WALLET_ICON_COMPONENTS } from "@/modules/wallets/lib/wallet-icons";

// Reuses wallet's curated icon set directly — CreditCardIconKey is a type
// alias of WalletIconKey (see @oinc/api/credit-card-appearance), and both
// domains render the same way (icon-in-a-tinted-circle). See design.md
// Decision 5.
export const CREDIT_CARD_ICON_COMPONENTS: Record<
  CreditCardIconKey,
  LucideIcon
> = WALLET_ICON_COMPONENTS;
