import type { CreditCard } from "../domain/credit-card";
import type { StatementCycle } from "../domain/statement-cycle";

export function toCreditCardResponse(
  creditCard: CreditCard,
  statement: StatementCycle & { statementTotal: number },
) {
  return {
    id: creditCard.id,
    name: creditCard.name,
    balance: creditCard.balance,
    color: creditCard.color,
    icon: creditCard.icon,
    statementCloseDay: creditCard.statementCloseDay,
    dueDay: creditCard.dueDay,
    statement: {
      openCycleStart: statement.openCycleStart,
      closedCycleStart: statement.closedCycleStart,
      closedCycleEnd: statement.closedCycleEnd,
      dueDate: statement.dueDate,
      total: statement.statementTotal,
    },
    createdAt: creditCard.createdAt.toISOString(),
    updatedAt: creditCard.updatedAt.toISOString(),
  };
}

export type CreditCardResponse = ReturnType<typeof toCreditCardResponse>;
