import { describe, expect, test } from "bun:test";
import { computeStatementCycle } from "./statement-cycle";

describe("computeStatementCycle", () => {
  test("computes the open cycle start, closed cycle range, and due date for a card mid-cycle", () => {
    // statementCloseDay 5, "today" is 2026-07-20 — most recent close was
    // 2026-07-05, previous close 2026-06-05.
    const cycle = computeStatementCycle("2026-07-20", 5, 20);

    expect(cycle.closedCycleStart).toBe("2026-06-06");
    expect(cycle.closedCycleEnd).toBe("2026-07-05");
    expect(cycle.openCycleStart).toBe("2026-07-06");
  });

  test("due date falls in the same month as the close when dueDay > statementCloseDay", () => {
    const cycle = computeStatementCycle("2026-07-20", 5, 20);

    expect(cycle.closedCycleEnd).toBe("2026-07-05");
    expect(cycle.dueDate).toBe("2026-07-20");
  });

  test("due date falls in the month after the close when dueDay <= statementCloseDay", () => {
    const cycle = computeStatementCycle("2026-07-20", 20, 5);

    // Most recent close (day 20) is 2026-07-20 itself (today == close day).
    expect(cycle.closedCycleEnd).toBe("2026-07-20");
    expect(cycle.dueDate).toBe("2026-08-05");
  });

  test("rolls a close day past the end of a short month to the 1st of the next month", () => {
    // statementCloseDay 31, "today" 2026-02-15 — the most recent close
    // couldn't have happened in February, so it rolls back to the previous
    // month's overflowed date (Jan 31), same as JS Date's native rollover.
    const cycle = computeStatementCycle("2026-02-15", 31, 15);

    expect(cycle.closedCycleEnd).toBe("2026-01-31");
  });
});
