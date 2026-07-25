"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/components/nav-items";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Flattened so a nested route (e.g. /transactions/categories) can match its
// own "Categories" entry rather than falling back to its parent's title.
const flatNavItems = navItems.flatMap((item) => [item, ...(item.items ?? [])]);

export function SiteHeader() {
  const pathname = usePathname();
  // Longest url match wins, so a nested item's more specific url is
  // preferred over its parent's shorter, also-matching prefix.
  const activeItem = [...flatNavItems]
    .filter((item) => pathname.startsWith(item.url))
    .sort((a, b) => b.url.length - a.url.length)[0];

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="flex-1 text-base font-medium">
          {activeItem?.title ?? "Dashboard"}
        </h1>
      </div>
    </header>
  );
}
