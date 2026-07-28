"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateInvestmentDialog } from "./components/create-investment-dialog";
import { InvestmentEmptyState } from "./components/investment-empty-state";
import { InvestmentList } from "./components/investment-list";
import { InvestmentsTotal } from "./components/investments-total";
import { useInvestmentsQuery } from "./hooks/use-investments-query";

export function InvestmentsPage() {
  const { data: investments, isPending } = useInvestmentsQuery();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Investments</h1>
        <CreateInvestmentDialog
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              Add holding
            </Button>
          }
        />
      </div>

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : investments && investments.length > 0 ? (
        <>
          <InvestmentsTotal investments={investments} />
          <InvestmentList investments={investments} />
        </>
      ) : (
        <InvestmentEmptyState />
      )}
    </div>
  );
}
