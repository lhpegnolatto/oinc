## Why

`/dashboard` is currently a placeholder ("Nothing here yet" + a link to `/wallets`). Wallets
and transactions have both shipped, so there's now enough data to make the dashboard the
"at a glance" home screen the product doc envisions: net worth, where it's split across
wallets, recent activity, and where money went this month — plus the fastest path to log a
new transaction.

## What Changes

- Replace the placeholder `/dashboard` with an overview page composed of:
  - Net worth total (reuses `NetWorthTotal`) plus a donut/pie chart showing each wallet's
    share of net worth (colored with each wallet's existing `color`). Wallets with a
    negative balance are excluded from the chart's slices (a pie chart can't represent a
    negative share) but still counted in the net-worth total.
  - A "Recent transactions" list: the last 5 transactions across all wallets (reuses
    `TransactionListItem` in its all-wallets shape), with a "See all" link to `/transactions`.
  - A "Top categories" list: expense categories ranked by amount for the current calendar
    month, name + total only (no chart, no date-range picker — that's left to a future,
    more complete spending-insights change).
  - A prominent "Add transaction" call-to-action, replacing the header's version.
  - An empty state for a user with zero wallets that prompts creating the first one, instead
    of rendering a $0 net worth with empty sections.
- **BREAKING (UX)**: Remove the always-visible "Add transaction" button from the global
  site header (`QuickAddTransactionTrigger` in `site-header.tsx`). The `n` keyboard shortcut
  stays mounted globally (works from any private route, still pre-fills the wallet when
  triggered from `/wallets/[id]`) — only the clickable button moves, to the dashboard.
- Add an optional `limit` query param to the transactions list API
  (`GET /transactions`), threaded through `listTransactionsQuerySchema` →
  `listTransactionsForUser` → `TransactionsRepository.findAllForUser`, so the dashboard
  doesn't have to fetch a user's entire transaction history to show 5 rows.
- Add a chart primitive to `apps/web` (shadcn's `chart` component, wrapping Recharts) —
  first use of a charting library in the repo.

## Capabilities

### New Capabilities
- `dashboard`: the `/dashboard` overview page — net worth + wallet breakdown chart, recent
  transactions, top categories this month, quick-add entry point, and the zero-wallets
  empty state.

### Modified Capabilities
- `wallets`: the existing "dashboard links to `/wallets`" requirement expands — the
  dashboard now also displays the net-worth total and a per-wallet breakdown chart, not
  just a bare link. Wallet CRUD still cannot occur on the dashboard.
- `transactions`: the quick-add requirement's "visible quick-action affordance ... from
  anywhere in the private app" changes — the visible affordance is now dashboard-only,
  while the keyboard shortcut remains reachable from anywhere. Also adds the `limit` query
  param to the all-wallets transaction list.

## Impact

- **web**: new `src/modules/dashboard/` (page, components, hooks); `site-header.tsx` loses
  its visible quick-add button; the `n`-shortcut listener moves out of
  `QuickAddTransactionTrigger` into something mounted at the private-layout level so it
  survives the button's relocation; new dependency on shadcn's `chart` component (Recharts).
- **api**: `apps/api/src/modules/transactions/` — `schemas/list-transactions-query.schema.ts`,
  `queries/list-transactions-for-user.ts`, `repositories/transactions-repository.ts` all gain
  the `limit` param. Possibly a new query for "top categories this month" (or computed
  client-side from the existing all-transactions endpoint filtered by date — decided in
  design.md).
- **Roadmap**: this pulls the category-breakdown half of roadmap row 8
  (`spending-insights`) forward into this change. `.docs/product/roadmap.md` row 8 should be
  updated in this same change to reflect that it now covers monthly *trend* analysis, since
  a first-cut category breakdown ships here.
