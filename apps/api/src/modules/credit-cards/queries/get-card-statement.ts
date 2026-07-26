import { computeStatementCycle } from "../domain/statement-cycle";
import type { CreditCardsRepository } from "../repositories/credit-cards-repository";

export async function getCardStatement(
  repo: CreditCardsRepository,
  input: {
    cardId: string;
    statementCloseDay: number;
    dueDay: number;
    // Overridable for deterministic tests — defaults to the real server
    // clock's date otherwise (no per-user timezone handling, per design.md
    // Non-Goals).
    today?: string;
  },
) {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const cycle = computeStatementCycle(
    today,
    input.statementCloseDay,
    input.dueDay,
  );
  const statementTotal = await repo.sumPostedChargesInRange(
    input.cardId,
    cycle.closedCycleStart,
    cycle.closedCycleEnd,
  );
  return { ...cycle, statementTotal };
}
