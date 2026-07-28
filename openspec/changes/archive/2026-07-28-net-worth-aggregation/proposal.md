## Why

The dashboard's "net worth" is currently just the sum of wallet balances — credit card
debt and investment holdings, both of which now exist as tracked domains
(`credit-cards`, `investments`), aren't reflected anywhere on it. A user with a card
balance or a brokerage holding sees a net-worth number that overstates what they
actually have. `investments-core` was sequenced immediately before this change
specifically so all three domains would exist before the rollup is built.

## What Changes

- Dashboard's net-worth total becomes `wallets + investments − credit card balances`
  instead of `wallets` alone.
- The wallet-only breakdown pie chart becomes a two-domain breakdown of positive
  holdings — wallets and investments — replacing `WalletBreakdownChart`. Credit card
  debt is not a pie slice (a pie chart has no meaningful way to render a negative
  share of a whole); it's surfaced instead in the summary line below.
- The dashboard adds a small labeled summary of the three contributing totals
  (reusing the existing `NetWorthTotal`/`InvestmentsTotal`/`CreditCardTotalBalance`-style
  presentation) next to the headline number, so the number's composition — including
  the card balance being subtracted — is visible without accounting terminology
  ("assets"/"liabilities") per `.docs/product/overview.md`'s non-goals.
- Aggregation happens entirely client-side, composing the existing
  `useWalletsQuery`, `useCreditCardsQuery`, and `useInvestmentsQuery` hooks in a new
  `useNetWorth` hook — no new API endpoint, no new `dashboard` API module. This
  matches the existing precedent (`useTopCategories`, which composes
  `useAllTransactionsQuery` + `useCategoriesQuery` client-side) and avoids a
  cross-module aggregation layer that the CQRS module-isolation rule would otherwise
  require on the API side.
- **No trend line / history.** This change is a point-in-time rollup only — wallet
  balance, card balance, and investment `currentValue` are all live-only fields with
  no snapshot table (a deliberate gap `investments-core`'s design left for this
  change to decide, not silently inherit). A net-worth-over-time chart would require
  a new snapshot mechanism and is out of scope; if wanted later, it's its own
  roadmap row.
- Dashboard's empty-state gate is unchanged: no wallets still shows the create-wallet
  CTA. Credit cards and investments are optional contributors that show as zero when
  the user has none — no new empty-state states are introduced for the net-worth
  section specifically.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `dashboard`: net-worth total now includes credit card balances (subtracted) and
  investment values (added), not just wallet balances. The breakdown chart shows
  wallets and investments as slices (credit cards are not a pie slice — see
  `design.md`), plus a labeled summary of the three contributing totals.
- `wallets`: the `/wallets` page's own total — currently a scenario titled
  *"`/wallets` shows a net-worth total"* — is relabeled to a wallets-only total, since
  "net worth" now refers specifically to the `dashboard` capability's combined
  figure. No behavior change to what the total sums, only to what it's called.

## Impact

- **web**: `apps/web/src/modules/dashboard/` — `dashboard-page.tsx`, a new
  `use-net-worth.ts` hook, `wallet-breakdown-chart.tsx` replaced/extended into a
  two-domain breakdown chart. Pulls in `useCreditCardsQuery` and
  `useInvestmentsQuery` (both already exist in `credit-cards`/`investments`
  modules) alongside the existing `useWalletsQuery`.
- **web**: `apps/web/src/modules/wallets/components/net-worth-total.tsx` and its
  usage in `wallets-page.tsx` — relabeled from "Net worth" to a wallets-scoped
  label; no change to what it computes.
- No API changes — `apps/api` is untouched by this change.
- No database schema changes.
- Not a frequent user action (no new create/edit flow), so no keyboard shortcut or
  sheet is introduced by this change.
