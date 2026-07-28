import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-currency";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { InvestmentDto } from "../api";
import { INVESTMENT_ICON_COMPONENTS } from "../lib/investment-icons";
import { DeleteInvestmentDialog } from "./delete-investment-dialog";
import { EditInvestmentDialog } from "./edit-investment-dialog";

export function InvestmentCard({ investment }: { investment: InvestmentDto }) {
  const Icon = INVESTMENT_ICON_COMPONENTS[investment.icon as WalletIconKey];
  const { gainLoss } = investment;
  const isGain = gainLoss !== null && gainLoss >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div
            data-testid="investment-appearance"
            data-icon={investment.icon}
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: investment.color }}
          >
            <Icon className="size-4 text-white" />
          </div>
          <CardTitle>{investment.name}</CardTitle>
        </div>
        <CardAction className="flex gap-1">
          <EditInvestmentDialog investment={investment} />
          <DeleteInvestmentDialog investment={investment} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-semibold">
          {formatCurrency(investment.currentValue)}
        </p>
        {gainLoss !== null && (
          <p
            className={
              isGain
                ? "text-sm font-medium text-green-600 dark:text-green-500"
                : "text-sm font-medium text-red-600 dark:text-red-500"
            }
          >
            {isGain ? "+" : "-"}
            {formatCurrency(Math.abs(gainLoss))}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(new Date(investment.updatedAt))}
        </p>
      </CardContent>
    </Card>
  );
}
