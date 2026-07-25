## Context

`/dashboard` (`apps/web/src/app/(private)/dashboard/page.tsx`) is currently a placeholder.
`wallets-crud` and `transactions-core` have both shipped, leaving reusable pieces this
change composes rather than rebuilds: `NetWorthTotal`, `useWalletsQuery`,
`useAllTransactionsQuery`/`fetchAllTransactions` (already sorted `desc(date), desc(createdAt)`,
already supports `type`/`dateFrom`/`dateTo` filters, no `limit` yet), `TransactionListItem`
(already renders the all-wallets shape with a wallet badge), and `WalletEmptyState`/
`AllTransactionsEmptyState` as empty-state precedent. Both `wallet.color` and category
`.color` already exist and are reused as chart colors — no new palette needed.

This also pulls the category-breakdown half of roadmap row 8 (`spending-insights`)
forward: `.docs/product/roadmap.md` frames row 8 as "category breakdown / monthly trend,"
and a first-cut category breakdown ships in this change. Row 8 should be edited in this
change to read as monthly *trend* analysis (the part not covered here).

## Goals / Non-Goals

**Goals:**
- Turn `/dashboard` into the app's home screen: net worth + wallet breakdown, recent
  activity, a spending signal, and the fastest path to log a transaction.
- Keep the `n` keyboard shortcut working from every private route, unchanged in behavior,
  even though its visible button moves.
- Avoid a new backend query surface where an existing one already covers the need.

**Non-Goals:**
- No date-range picker or category trend-over-time chart — that's `spending-insights`
  (roadmap row 8).
- No wallet or category CRUD on the dashboard (wallets spec already forbids wallet CRUD
  here; this change doesn't add category CRUD here either).
- No income-side category breakdown — "top categories" is expense-only, matching the
  "where did my money go" framing; income already surfaces via net worth.
- No credit cards / investments in the net-worth number yet — those roll in at roadmap
  rows 4–7 and row 7 (`net-worth-aggregation`) specifically.

## Decisions

### 1. Split the quick-add button from the quick-add shortcut

Today `QuickAddTransactionTrigger` (in `site-header.tsx`) bundles three things: the visible
button, the `n`-key listener, and the sheet's `open` state — all in one component mounted
once, globally.

This change moves the visible button to the dashboard but the `transactions` spec still
requires the shortcut to work "from anywhere in the private app" (unchanged). Splitting
button from shortcut into two consumers of one shared `open` state needs *some* shared
place to live above both — introduce a small client-side context provider,
`QuickAddTransactionProvider` (`modules/transactions/components/`), that:
- Owns the `open` state and renders `QuickAddTransactionSheet` once.
- Registers the `n` shortcut itself (still `usePathname()`-aware, so pre-fill from
  `/wallets/[id]` is unchanged).
- Exposes `useQuickAddTransaction()` → `{ open: () => void }` via context.

Mount it in `app/(private)/layout.tsx`, wrapping `children` (same pattern as the existing
`NuqsAdapter` wrap — a "use client" component taking `children`, safe to render from the
async server layout). `site-header.tsx` drops `QuickAddTransactionTrigger` entirely. The
dashboard's "Add transaction" CTA calls `useQuickAddTransaction().open()`.

**Alternative considered**: keep two independent sheet instances (one shortcut-only,
mounted globally; one button-triggered, local to the dashboard). Rejected — two `Sheet`s
mounted simultaneously risks both opening independently and drifting in behavior (e.g. a
future field default changing in one but not the other); a single shared instance is the
simpler invariant to hold.

### 2. Wallet breakdown chart excludes negative-balance wallets

Wallet `balance` has no non-negative constraint (`z.number().finite()` — see
`apps/api/src/modules/wallets/schemas/create-wallet.schema.ts`), so a wallet can be
overdrawn. A pie/donut chart can't render a negative slice. Decision: the chart only plots
wallets with `balance > 0`; the net-worth number above it still sums all wallets
(positive and negative), so the total stays correct even when the chart can't fully
represent it. A wallet with `balance === 0` is also excluded (a zero-width slice adds
nothing).

**Alternative considered**: `Math.abs()` the negative balances into the chart. Rejected —
that would visually overstate net worth's composition (a debt would read as if it were an
asset), which is worse than omitting it.

### 3. Top categories computed client-side, no new API endpoint

"Top expense categories this month" is: take the current month's expense transactions,
group by `categoryId`, sum `amount`, sort descending. `GET /transactions` already accepts
`type` and `dateFrom`/`dateTo` (see `listTransactionsQuerySchema`), so
`useAllTransactionsQuery({ type: "expense", dateFrom: <first of month>, dateTo: <today> })`
already returns exactly the rows needed — the aggregation is a `reduce` in a new
`modules/dashboard/hooks/use-top-categories.ts`, not a new query. Dataset size is bounded
(one user's transactions for one month), so client-side grouping is proportionate — adding
a dedicated aggregation endpoint would be backend complexity this data volume doesn't
justify (see "simple, not comprehensive" in `.docs/product/overview.md`).

### 4. `limit` param on `GET /transactions`

Recent-transactions needs "last 5," and today the only way to get that is fetching the
user's entire transaction history and slicing client-side — fine now, wrong once history
grows. Add optional `limit` (positive integer) to `listTransactionsQuerySchema`, pass
through `listTransactionsForUser` and `TransactionsRepository.findAllForUser` as a SQL
`LIMIT`. Sort order is already `desc(date), desc(createdAt)`, so `limit` naturally returns
the most recent N. Scoped to this one schema/query/repo method only — the wallet-scoped
`GET /wallets/:walletId/transactions` route uses a different schema and is untouched.

### 5. Chart library: shadcn's `chart` component (Recharts)

No chart library exists in the repo yet. Per `.docs/architecture/frontend.md`, any new
component must go through the shadcn skill rather than hand-rolling — `chart` is shadcn's
own registry component (thin Recharts wrapper), consistent with the existing `nova`/`base`
preset. This is the first Recharts dependency in `apps/web`; no alternative library was
considered given the design-system constraint already picks the tool.

## Risks / Trade-offs

- **[Risk]** Moving the button off the header is a discoverability regression for anyone
  who isn't on the dashboard and doesn't know the shortcut. → **Mitigation**: the shortcut
  itself is unchanged and still global; the dashboard nav item is one click away and shows
  the CTA prominently, and shortcut hints remain visible per the product doc's
  discoverability requirement (existing `QuickAddTransactionSheet`/trigger UI already
  surfaces this — no new hint mechanism needed).
- **[Risk]** Excluding negative/zero-balance wallets from the chart could look like a bug
  ("where did my overdrawn wallet go?") rather than a deliberate choice. → **Mitigation**:
  the net-worth number right above the chart still reflects it; if this proves confusing in
  practice, a legend note is a small follow-up, not a re-design.
- **[Trade-off]** Client-side aggregation for top categories re-fetches/re-groups on every
  dashboard load rather than being pre-computed. Acceptable at current scale (per Decision
  3); revisit if `spending-insights` (row 8) needs a shared aggregation endpoint anyway.

## Migration Plan

No data migration. Deploy order doesn't matter for correctness (the `limit` param is
additive/optional; old clients keep working without it), but the frontend dashboard change
depends on the `limit` param existing, so ship the API change first or in the same deploy.
No rollback concerns beyond reverting the commit — no schema changes, no destructive data
operations.

## Open Questions

- None outstanding — the two threads raised in exploration (recent-transactions count,
  top-categories shape) were resolved during `/opsx:explore`: 5 recent transactions, top
  categories as a ranked list (not a chart), current calendar month.
