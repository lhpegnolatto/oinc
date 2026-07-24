import { LayoutDashboardIcon, type LucideIcon, WalletIcon } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Wallets", url: "/wallets", icon: WalletIcon },
];
