// Pure date math, no DB access — see design.md Decision 2. JS `Date`'s native
// month-rollover handles short months the same way
// credit-card-installments Decision 5 already accepted for installment
// dates (e.g. closeDay: 31 in a 30-day month lands on the 1st of the next
// month) — no bespoke day-clamping helper.
export interface StatementCycle {
  // Start date of the still-accumulating cycle (the day after the most
  // recent close).
  openCycleStart: string;
  // The most-recently-closed cycle's date range, inclusive on both ends.
  closedCycleStart: string;
  closedCycleEnd: string;
  // The closed cycle's due date.
  dueDate: string;
}

function parseDateString(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateForDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );
}

// The most recent statement close on or before `today`.
function mostRecentCloseDate(today: Date, statementCloseDay: number): Date {
  const candidate = dateForDay(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    statementCloseDay,
  );
  return candidate > today
    ? dateForDay(
        today.getUTCFullYear(),
        today.getUTCMonth() - 1,
        statementCloseDay,
      )
    : candidate;
}

export function computeStatementCycle(
  today: string,
  statementCloseDay: number,
  dueDay: number,
): StatementCycle {
  const todayDate = parseDateString(today);
  const mostRecentClose = mostRecentCloseDate(todayDate, statementCloseDay);
  const previousClose = dateForDay(
    mostRecentClose.getUTCFullYear(),
    mostRecentClose.getUTCMonth() - 1,
    statementCloseDay,
  );

  // due date: first occurrence of dueDay strictly after mostRecentClose
  // (same month if dueDay > statementCloseDay, else next month).
  const dueMonthOffset = dueDay > statementCloseDay ? 0 : 1;
  const dueDate = dateForDay(
    mostRecentClose.getUTCFullYear(),
    mostRecentClose.getUTCMonth() + dueMonthOffset,
    dueDay,
  );

  return {
    openCycleStart: toDateString(addDays(mostRecentClose, 1)),
    closedCycleStart: toDateString(addDays(previousClose, 1)),
    closedCycleEnd: toDateString(mostRecentClose),
    dueDate: toDateString(dueDate),
  };
}
