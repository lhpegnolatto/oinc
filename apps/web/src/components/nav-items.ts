import {
  CreditCardIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ReceiptIcon,
  TagIcon,
  WalletIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  // One level of nesting only, on purpose — see design.md decision 5.
  items?: NavItem[];
};

export const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Wallets", url: "/wallets", icon: WalletIcon },
  { title: "Credit Cards", url: "/credit-cards", icon: CreditCardIcon },
  {
    title: "Transactions",
    url: "/transactions",
    icon: ReceiptIcon,
    items: [
      { title: "Categories", url: "/transactions/categories", icon: TagIcon },
    ],
  },
];
