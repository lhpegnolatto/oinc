## Context

Three domains now hold money-shaped numbers that never talk to each other:
`wallet.balance` (asset, can be negative), `credit_card.balance` (liability, amount
owed), `investment.currentValue` (asset, always ≥ 0). The dashboard today only knows
about the first — `NetWorthTotal` (`apps/web/src/modules/wallets/components/net-worth-total.tsx`)
sums `wallets`, and `WalletBreakdownChart` charts wallets' share of that sum. Cards and
investments each already have their own totals on their own pages
(`CreditCardTotalBalance`, `InvestmentsTotal`), but nothing rolls all three into one
number.

`investments-core`'s design doc explicitly deferred two things to this change: whether
a holding's value history matters for net worth, and restating that logging both an
expense transaction and an investment holding for the same purchase is correct
double-representation, not a bug. Both are addressed under Non-Goals / Risks below.

The existing `dashboard` module has no server-side aggregation precedent to break —
`useTopCategories` (`apps/web/src/modules/dashboard/hooks/use-top-categories.ts`)
already composes two list-fetching hooks (`useAllTransactionsQuery`,
`useCategoriesQuery`) into a derived value with `useMemo`, entirely in `apps/web`, with
no dedicated `dashboard` API module. This change extends that same pattern instead of
introducing a new one.

## Goals / Non-Goals

**Goals:**
- Dashboard's net-worth headline reflects all three domains:
  `wallets + investments − credit cards`.
- The breakdown chart and summary make the number's composition legible without
  accounting jargon.
- No new API surface, no new database table/column.

**Non-Goals:**
- Net-worth history / trend-over-time chart. `wallet.balance`, `credit_card.balance`,
  and `investment.currentValue` are all live-only fields — none of the three domains
  persist snapshots. Building a snapshot mechanism (schedule, retention, backfill) is
  a separate, real feature, not a byproduct of summing three current numbers. If
  wanted later, it gets its own roadmap row and proposal.
- Any change to how `wallets`, `credit-cards`, or `investments` compute their own
  `balance`/`currentValue` — this change only reads those values, never touches how
  they're derived or stored.
- Reconciling the "logged both a transaction and a holding for the same purchase"
  case — restated from `investments-core`'s design doc as intentional, accurate
  double-representation (cash down via the transaction, investment value up via the
  holding), not something this change corrects or warns about.
- A dedicated net-worth API endpoint — see Decision 1.

## Decisions

### 1. Aggregation stays entirely client-side — no new `dashboard` API module

**Chosen**: a new `useNetWorth` hook in `apps/web/src/modules/dashboard/hooks/`
composes `useWalletsQuery`, `useCreditCardsQuery`, and `useInvestmentsQuery` (all
three already exist and are already fetched on their respective pages) and derives
`{ walletsTotal, investmentsTotal, cardsTotal, netWorth }` with `useMemo`, mirroring
`useTopCategories`'s shape exactly.

**Alternative considered**: a new `apps/api/src/modules/dashboard/` with a
`GET /dashboard/net-worth` query that sums across `wallet`, `credit_card`, and
`investment` tables server-side. Rejected: the CQRS module-isolation rule in
CLAUDE.md ("modules never import another module's repositories/commands/domain
directly") means a cross-module query needs either three repository calls
orchestrated in a new module or duplicated summing logic — real infrastructure to
save three `Array.reduce` calls the web layer already has the data for, since all
three list endpoints are fetched independently elsewhere in the app anyway. Revisit
only if a future need (e.g. server-rendering the dashboard, or a mobile client that
can't afford three round-trips) makes the client-side triple-fetch a real cost.

### 2. Breakdown chart shows two domains (wallets, investments), not three

**Chosen**: `WalletBreakdownChart` is replaced by a chart that includes both wallets
and investments as slices (same positive-balance-only filter wallets already use,
applied to investments too — `currentValue` is always ≥ 0 per `investments-core` so
this is a no-op filter for investments in practice, kept for consistency). Credit
card balances are not a slice.

**Why**: a pie/donut chart represents parts of a positive whole. A credit card
balance is a liability being subtracted from the total, not a share of it — there is
no coherent "this slice is 15% of your net worth" statement for a negative number.
Forcing it in (e.g. as a slice sized by absolute value) would visually imply it's
additive, which misstates what it is.

**Alternative considered**: render cards as a slice with a distinct (e.g. red/muted)
color to visually separate "owed" from "held." Rejected as unnecessary complexity
for what the summary line under Decision 3 already communicates plainly, and it
still doesn't resolve the "slice of what, exactly" problem — a card balance isn't a
share of net worth in the same units as an asset slice is.

### 3. Composition is shown as three separate labeled totals, not an assets/liabilities table

**Chosen**: alongside the chart, render the same three total components that already
exist elsewhere in the app (`NetWorthTotal`-style wallets total, `InvestmentsTotal`,
`CreditCardTotalBalance`), reused or lightly adapted, in a compact row/list next to
the headline `netWorth` number.

**Why**: `.docs/product/overview.md` non-goals rule out requiring accounting
terminology. Three plain labeled numbers ("Wallets", "Investments", "Card balances")
next to one bold total accomplishes the same transparency as an assets/liabilities
breakdown without introducing that vocabulary.

### 4. `/wallets` page's own total is relabeled, not left saying "Net worth"

**Chosen**: `NetWorthTotal` (`apps/web/src/modules/wallets/components/net-worth-total.tsx`)
is also rendered on `wallets-page.tsx`, labeled "Net worth," summing only wallet
balances. Once the dashboard's "Net worth" means `wallets + investments − cards`,
that label on `/wallets` becomes actively wrong, not just incomplete — it invites the
same overstatement this change exists to fix, just on a different page. The
component is relabeled (e.g. "Wallets total") for its `/wallets`-page usage; the
dashboard gets its own new summary component computing the real net-worth figure.

**Alternative considered**: leave `/wallets`'s total as-is since it's technically a
different, pre-existing capability (`wallets` spec, not `dashboard` spec) that this
change's proposal didn't originally list under Modified Capabilities. Rejected:
shipping a change whose entire point is "don't call wallet-only totals net worth"
while leaving exactly that mislabeling in place elsewhere in the app defeats the
change's own purpose. The existing `wallets` spec requirement ("A signed-in user can
view only their own wallets") has a scenario literally titled *"`/wallets` shows a
net-worth total"* — that scenario title is renamed (to something like *"`/wallets`
shows a wallets total"*) as part of this change, so `wallets` is added to Modified
Capabilities alongside `dashboard`.

### 5. Empty-state gate unchanged — still wallets-only

**Chosen**: the existing `dashboard` requirement ("shows an empty state for a user
with no wallets") is untouched. A user with wallets but zero cards/investments simply
sees `cardsTotal`/`investmentsTotal` as 0 in the summary and chart — no new empty
states are introduced for the net-worth section.

**Why**: the product doc names wallets as "the starting point for a user's net
worth" — they remain the one required domain. Building a combinatorial empty-state
matrix (wallets-only, wallets+cards, wallets+investments, all three) for what is, in
practice, just "the normal state for a new user before they add cards or
investments" adds UI surface with no product value.

## Risks / Trade-offs

- **[Trade-off]** No historical net-worth view — a user can't see whether their net
  worth is trending up or down over time. → **Mitigation**: none in this change;
  explicitly deferred (see Non-Goals). Each of the three domains already surfaces its
  own current value on its own page for a user who wants to check month-to-month by
  memory/notes in the interim.
- **[Risk]** `useNetWorth` triple-fetches wallets, cards, and investments on every
  dashboard load, in addition to whatever `RecentTransactions`/`TopCategories`
  already fetch — more round-trips than today. → **Mitigation**: all three queries
  are already cheap, user-scoped, indexed list reads (each domain already pays this
  cost on its own page); React Query's cache means navigating dashboard → /wallets
  → dashboard doesn't refetch. Acceptable for a single-user personal app; revisit
  only if real latency shows up.
- **[Trade-off]** A user who logs an investment purchase as both an expense
  transaction and a new holding will see net worth first drop (cash out) and then
  rise back (holding added) — correct, but could read as a glitch if the two actions
  aren't done back-to-back. → **Mitigation**: none needed (restated from
  `investments-core`'s design doc as intentional behavior, not a defect this change
  introduces).

## Migration Plan

Purely additive/UI — no schema, no migration, no backend deploy step.
`WalletBreakdownChart` and `NetWorthTotal`'s usages on `/dashboard`
(`dashboard-page.tsx`) are replaced by the new net-worth summary and breakdown chart
in the same change. `NetWorthTotal` itself stays in place and keeps rendering on
`/wallets` (`wallets-page.tsx`), relabeled per Decision 4 — it is not deleted, since
it still correctly serves that page's own wallets-only total.
