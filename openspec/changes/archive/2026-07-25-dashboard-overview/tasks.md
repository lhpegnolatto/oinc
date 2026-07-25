## 1. API: `limit` on the all-wallets transaction list

- [x] 1.1 Add optional `limit` (positive integer) to `listTransactionsQuerySchema`
  (`apps/api/src/modules/transactions/schemas/list-transactions-query.schema.ts`)
- [x] 1.2 Thread `limit` through `listTransactionsForUser`
  (`apps/api/src/modules/transactions/queries/list-transactions-for-user.ts`) into
  `TransactionsRepository.findAllForUser`
  (`apps/api/src/modules/transactions/repositories/transactions-repository.ts`), applied as
  a SQL `LIMIT` after the existing `orderBy(desc(date), desc(createdAt))`
- [x] 1.3 Test: `GET /transactions?limit=N` with more than N matching transactions returns
  exactly the N most recent (extend
  `apps/api/src/modules/transactions/controllers/index.test.ts`)
- [x] 1.4 Test: `limit` combined with existing filters (e.g. `type`, `dateFrom`/`dateTo`)
  still applies both correctly

## 2. Web: quick-add shortcut/button split

- [x] 2.1 Create `QuickAddTransactionProvider`
  (`apps/web/src/modules/transactions/components/quick-add-transaction-provider.tsx`):
  owns the sheet's `open` state, renders `QuickAddTransactionSheet` once, registers the `n`
  shortcut via `useKeyboardShortcut` (pathname-aware default-wallet pre-fill unchanged),
  exposes `useQuickAddTransaction()` returning `{ open: () => void }` via context
- [x] 2.2 Mount `QuickAddTransactionProvider` in `apps/web/src/app/(private)/layout.tsx`,
  wrapping `children`
- [x] 2.3 Remove `QuickAddTransactionTrigger`'s visible button and its usage from
  `apps/web/src/components/site-header.tsx`; delete `quick-add-transaction-trigger.tsx` if
  nothing else references it
- [x] 2.4 Test: pressing `n` from a non-dashboard private page (e.g. `/wallets`) still opens
  the quick-add sheet
- [x] 2.5 Test: pressing `n` from `/wallets/[id]` still pre-fills that wallet
- [x] 2.6 Test: pressing `n` while focus is inside an input/textarea/select is still ignored

## 3. Web: dashboard module scaffolding

- [x] 3.1 Create `apps/web/src/modules/dashboard/` (`components/`, `hooks/`,
  `dashboard-page.tsx`) per the module-owns-logic convention; `app/(private)/dashboard/page.tsx`
  becomes a thin import of `DashboardPage`
- [x] 3.2 Add shadcn's `chart` component via the shadcn skill (first Recharts usage in
  `apps/web`)

## 4. Web: net worth + wallet breakdown chart

- [x] 4.1 Build `WalletBreakdownChart`
  (`modules/dashboard/components/wallet-breakdown-chart.tsx`) using `useWalletsQuery()`,
  filtering to `balance > 0` for chart slices, colored by each wallet's `color`
- [x] 4.2 Reuse `NetWorthTotal` above/beside the chart, computed from all wallets
  (including non-positive balances)
- [x] 4.3 Test: a wallet with balance <= 0 is excluded from the chart's rendered slices but
  still counted in the net-worth total (component-level test)

## 5. Web: recent transactions

- [x] 5.1 Build `RecentTransactions` (`modules/dashboard/components/recent-transactions.tsx`)
  using `useAllTransactionsQuery({ limit: 5 })` (requires task 1's `limit` param threaded
  through `modules/transactions/api.ts`'s `TransactionFilters`/`fetchAllTransactions`), reusing
  `TransactionListItem` for each row
- [x] 5.2 Add a "See all" link to `/transactions`
- [x] 5.3 Test: dashboard renders at most 5 transactions, most recent first, each showing
  its wallet

## 6. Web: top expense categories this month

- [x] 6.1 Build `use-top-categories.ts`
  (`modules/dashboard/hooks/use-top-categories.ts`): call
  `useAllTransactionsQuery({ type: "expense", dateFrom: <first of current month>, dateTo: <today> })`
  and group/sum by `categoryId`, sorted descending by total
- [x] 6.2 Build `TopCategories` (`modules/dashboard/components/top-categories.tsx`)
  rendering the ranked list (category name + total), with an empty state when there are no
  expense transactions this month
- [x] 6.3 Test: categories are ranked correctly by this-month expense total, income
  transactions excluded, and last month's transactions excluded

## 7. Web: quick-add CTA and zero-wallets empty state

- [x] 7.1 Add a prominent "Add transaction" button on the dashboard calling
  `useQuickAddTransaction().open()` (from task 2.1)
- [x] 7.2 Build a zero-wallets empty state (reusing `WalletEmptyState`'s treatment) shown
  instead of net worth/chart/recent-transactions/top-categories when `useWalletsQuery()`
  returns an empty list
- [x] 7.3 Test: a user with no wallets sees the create-wallet prompt and none of the other
  dashboard sections
- [x] 7.4 Test: clicking the dashboard's "Add transaction" button opens the quick-add sheet
  without navigating away

## 8. Docs

- [x] 8.1 Update `.docs/product/roadmap.md`: reframe row 8 (`spending-insights`) to reflect
  that a first-cut category breakdown now ships in `dashboard-overview`, and row 8 covers
  monthly trend analysis
- [x] 8.2 Delete the `dashboard-overview` row from `.docs/product/roadmap.md`'s table once
  this change is archived (per the roadmap's own workflow instructions)

## 9. Verification

- [x] 9.1 `bun run lint && bun test && bun run build` passes locally (no CI yet, per
  `CLAUDE.md`)
- [x] 9.2 Manually verify in a browser: dashboard loads for a user with wallets/transactions,
  `n` shortcut works from `/wallets`, `/transactions`, and `/wallets/[id]` (pre-fill), and
  the zero-wallets empty state renders for a fresh account
