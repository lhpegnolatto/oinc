# Product — Roadmap

Part of [.docs/product/](overview.md) — see [overview.md](overview.md) for vision, scope,
and non-goals this roadmap is scoped against.

This file tracks the **sequence of upcoming OpenSpec changes**, in the order they should
be proposed. It is a queue, not a history — once a row's change has been implemented and
archived under `openspec/changes/archive/`, delete the row instead of checking it off.
`openspec/specs/` and `openspec/changes/archive/` are the historical record of what
shipped; this file only needs to say what's left.

Each row is meant to become exactly one OpenSpec change (`/opsx:propose`) — small enough
to stay a single reviewable proposal/design/tasks unit. Don't batch multiple rows into one
proposal even when related (e.g. wallets + transactions): the dependency is real, but each
is its own vertical slice, and a later row's proposal should reference an earlier row's
already-archived spec rather than being designed blind to it.

## Shipped

Already covered by archived specs in `openspec/specs/`: monorepo/tooling skeleton,
`@oinc/env`, Google OAuth (`user-authentication`), new-user provisioning
(`user-provisioning`).

## Up next

| Order | Change slice | Module(s) | Why here |
|---|---|---|---|
| 1 | `investments-core` | api/web: `investments` | Manual holdings (symbol, quantity, cost basis) + manual valuation updates — deliberately shallow per non-goals (no live market data, no tax lots). |
| 2 | `net-worth-aggregation` | web: dashboard | Roll wallets + cards + investments into one net-worth number/chart — natural checkpoint once all three domains exist. |
| 3 | `spending-insights` | api/web: reporting (read-only queries, no new module expected) | Monthly trend analysis over time — a first-cut category breakdown (this month's top expense categories) already shipped in `dashboard-overview`; this row covers trend-over-time on top of it, plus a date-range picker. |

## Workflow per item

1. `/opsx:explore` (optional) — think through UX/edge cases before committing to a design.
2. `/opsx:propose` — describe the slice, get proposal + design + specs + tasks generated together.
3. `/opsx:apply` — implement against `tasks.md`.
4. `/opsx:sync` or `/opsx:archive` — fold the delta spec into `openspec/specs/` once merged.
5. Delete the row from this file's table.

## Keeping this documentation authoritative

If a proposed change reorders, merges, or splits a row here (e.g. credit cards turn out to
need two changes instead of one, or investments get pulled forward), update this file in
the same change rather than letting the table silently drift from what's actually being
built next.
