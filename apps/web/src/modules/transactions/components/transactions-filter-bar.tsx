"use client";

import type { CategoryIconKey } from "@oinc/api/category-appearance";
import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletsQuery } from "@/modules/wallets/hooks/use-wallets-query";
import { WALLET_ICON_COMPONENTS } from "@/modules/wallets/lib/wallet-icons";
import { useCategoriesQuery } from "../hooks/use-categories-query";
import { useTransactionsFilters } from "../hooks/use-transactions-filters";
import { CATEGORY_ICON_COMPONENTS } from "../lib/category-icons";

// Sentinel for "no filter applied" inside the Select components below — the
// underlying base-ui Select can't represent "no selection" as a real,
// selectable item the same way an empty/null value can, so an explicit
// "All ..." item maps back to clearing the corresponding nuqs key.
const ALL = "__all__";

export function TransactionsFilterBar() {
  const [filters, setFilters] = useTransactionsFilters();
  const { data: wallets } = useWalletsQuery();
  const { data: categories } = useCategoriesQuery();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.wallet ?? ALL}
        onValueChange={(next) =>
          setFilters({ wallet: next === ALL ? null : next })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filter by wallet">
          <SelectValue placeholder="All wallets">
            {(selected: string | null) =>
              (wallets ?? []).find((wallet) => wallet.id === selected)?.name ??
              "All wallets"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All wallets</SelectItem>
          {(wallets ?? []).map((wallet) => {
            const Icon = WALLET_ICON_COMPONENTS[wallet.icon as WalletIconKey];
            return (
              <SelectItem key={wallet.id} value={wallet.id}>
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: wallet.color }}
                >
                  <Icon className="size-3 text-white" />
                </span>
                {wallet.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? ALL}
        onValueChange={(next) =>
          setFilters({ category: next === ALL ? null : next })
        }
      >
        <SelectTrigger className="w-44" aria-label="Filter by category">
          <SelectValue placeholder="All categories">
            {(selected: string | null) =>
              (categories ?? []).find((category) => category.id === selected)
                ?.name ?? "All categories"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {(categories ?? []).map((category) => {
            const Icon =
              CATEGORY_ICON_COMPONENTS[category.icon as CategoryIconKey];
            return (
              <SelectItem key={category.id} value={category.id}>
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: category.color }}
                >
                  <Icon className="size-3 text-white" />
                </span>
                {category.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select
        value={filters.type ?? ALL}
        onValueChange={(next) =>
          setFilters({
            type: next === ALL ? null : (next as "income" | "expense"),
          })
        }
      >
        <SelectTrigger className="w-32" aria-label="Filter by type">
          <SelectValue placeholder="All types">
            {(selected: string | null) =>
              selected === "income"
                ? "Income"
                : selected === "expense"
                  ? "Expense"
                  : "All types"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        aria-label="From date"
        value={filters.dateFrom ?? ""}
        onChange={(event) =>
          setFilters({ dateFrom: event.target.value || null })
        }
        className="w-36"
      />
      <Input
        type="date"
        aria-label="To date"
        value={filters.dateTo ?? ""}
        onChange={(event) => setFilters({ dateTo: event.target.value || null })}
        className="w-36"
      />

      <div className="relative min-w-40 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search notes"
          placeholder="Search notes"
          value={filters.q ?? ""}
          onChange={(event) => setFilters({ q: event.target.value || null })}
          className="pl-8"
        />
      </div>
    </div>
  );
}
