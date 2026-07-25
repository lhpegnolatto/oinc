## 1. Database

- [x] 1.1 Add `transaction_userId_date_idx` index on `(userId, date)` to
  `shared/db/schema/transactions-schema.ts`
- [x] 1.2 Generate the Drizzle migration for the new index (`drizzle-kit generate`)

## 2. `apps/api` — all-wallets transaction query

- [x] 2.1 Add `listTransactionsForUser` in
  `modules/transactions/queries/list-transactions-for-user.ts`: scoped by
  `userId`, joins `wallet` for name/color/icon, accepts optional `walletId`,
  `categoryId`, `type`, `dateFrom`/`dateTo`, `noteSearch` (case-insensitive
  substring), ordered by `date` descending
- [x] 2.2 Add a Zod query-string schema for the filters and wire
  `GET /transactions` in `transactionsRouter`, validated via
  `zValidator("query", ...)`
- [x] 2.3 Extend the transaction response shape (or add a variant) to include
  the row's wallet name/color/icon
- [x] 2.4 Write bun tests (`withTestTransaction`, real Postgres) for: a
  signed-in user's all-wallets list only includes their own transactions
  across every wallet they own; filtering by wallet, category, type,
  date range, and note search each narrow results correctly; combining
  filters applies all of them; a filter combination matching nothing returns
  an empty list, not an error

## 3. `apps/web` — URL-state filter foundation

- [x] 3.1 Add `nuqs` as a workspace dependency in `apps/web`
- [x] 3.2 Wrap `app/(private)/layout.tsx`'s children in `NuqsAdapter`
- [x] 3.3 Add `modules/transactions/hooks/use-transactions-filters.ts` using
  `useQueryStates` for `wallet`, `category`, `type`, `dateFrom`, `dateTo`, `q`

## 4. `apps/web` — `/transactions` page

- [x] 4.1 Add a `GET /transactions` fetcher in `modules/transactions/api.ts`
  and a `useAllTransactionsQuery` hook (TanStack Query) taking the current
  filters as input
- [x] 4.2 Build filter UI (wallet/category/type selects, date-range control,
  note search input) bound to the hook from 3.3
- [x] 4.3 Build the all-wallets transaction list, extending
  `TransactionListItem` (or a variant) to show each row's wallet color/icon
- [x] 4.4 Add distinct empty states for "no transactions match these filters"
  vs. "no transactions logged yet at all"
- [x] 4.5 Add `app/(private)/transactions/page.tsx` composing 4.1–4.4
- [x] 4.6 Write a Playwright e2e test: a signed-in user filters
  `/transactions` by wallet, category, type, date range, and note search
  (individually and combined) and sees only matching transactions, with the
  URL reflecting the active filters
- [x] 4.7 Write a Playwright e2e test: reloading a filtered `/transactions`
  URL restores the same filtered view

## 5. `apps/web` — category management page

- [x] 5.1 Add `PATCH`/`DELETE /categories/:id` fetchers in
  `modules/transactions/api.ts` and `useUpdateCategoryMutation`/
  `useDeleteCategoryMutation` hooks
- [x] 5.2 Build `EditCategoryDialog` (reusing `CategoryAppearancePicker`) and
  `DeleteCategoryDialog` (mirroring `DeleteTransactionDialog`'s confirm
  pattern), surfacing a `CategoryInUseError` response as an inline message on
  delete
- [x] 5.3 Build the categories list view: system categories render read-only,
  custom categories show edit/delete actions
- [x] 5.4 Add `app/(private)/transactions/categories/page.tsx` composing
  5.1–5.3
- [x] 5.5 Write a Playwright e2e test: a signed-in user edits their own
  custom category's name/color/icon and sees it updated
- [x] 5.6 Write a Playwright e2e test: a signed-in user deletes an unused
  custom category and it disappears from the list
- [x] 5.7 Write a Playwright e2e test: a signed-in user attempts to delete a
  custom category still referenced by a transaction, sees an inline in-use
  error, and the category remains
- [x] 5.8 Write a Playwright e2e test: system categories show no edit/delete
  action

## 6. `apps/web` — sidebar navigation

- [x] 6.1 Extend `NavItem` in `components/nav-items.ts` with an optional
  `items?: NavItem[]`; add "Transactions" (`/transactions`) with "Categories"
  (`/transactions/categories`) as its child
- [x] 6.2 Update `components/nav-main.tsx` to render an item's `items` via
  `SidebarMenuSub`/`SidebarMenuSubButton`
- [x] 6.3 Write a bun test (server-rendered HTML tier) asserting a signed-in
  user's sidebar HTML includes the "Transactions" link and its nested
  "Categories" link

## 7. Final verification

- [x] 7.1 Run `bun run lint && bun test && bun run build` and fix any
  failures
- [x] 7.2 Run `bun run test:e2e` for the new Playwright specs and fix any
  failures
