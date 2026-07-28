## 1. Net-worth aggregation hook (web)

- [x] 1.1 Create `apps/web/src/modules/dashboard/hooks/use-net-worth.ts`: compose
      `useWalletsQuery`, `useCreditCardsQuery`, `useInvestmentsQuery` and derive
      `{ walletsTotal, investmentsTotal, cardsTotal, netWorth, isPending }` with
      `useMemo`, mirroring `use-top-categories.ts`'s shape (design.md Decision 1).
- [x] 1.2 Use case: net worth combines wallets, investments, and credit card
      balances (`netWorth = walletsTotal + investmentsTotal - cardsTotal`), including
      negative wallet balances in `walletsTotal`.

## 2. Dashboard UI (web)

- [x] 2.1 Replace the dashboard's `NetWorthTotal` usage
      (`apps/web/src/modules/dashboard/dashboard-page.tsx`) with a new summary
      component driven by `useNetWorth`: the combined `netWorth` headline plus the
      three labeled contributing totals (wallets, investments, credit cards) — no
      "assets"/"liabilities" terminology (design.md Decision 3).
- [x] 2.2 Replace `WalletBreakdownChart` with a two-domain breakdown chart including
      wallet and investment-holding slices (both filtered to value > 0), using each
      entity's own `color`. Credit card balances never render as a slice
      (design.md Decision 2).
- [x] 2.3 Update `dashboard-page.tsx` to fetch `useCreditCardsQuery` and
      `useInvestmentsQuery` alongside the existing `useWalletsQuery`, and combine
      their `isPending` states for the page's loading skeleton. The existing
      no-wallets empty-state gate stays unchanged (design.md Decision 5) — cards and
      investments contribute 0 when the user has none of either.

## 3. `/wallets` page relabel

- [x] 3.1 Relabel `apps/web/src/modules/wallets/components/net-worth-total.tsx`'s
      displayed text from "Net worth" to a wallets-scoped label (e.g. "Wallets
      total") for its `/wallets`-page usage (design.md Decision 4). No change to
      what the component computes.

## 4. Tests (Playwright e2e — client-side aggregation only observable post-hydration,
      per `.docs/architecture/testing.md`)

- [x] 4.1 Extend `apps/web/e2e/dashboard.spec.ts`: a signed-in user with wallets,
      credit card balances, and investment holdings sees a dashboard net-worth total
      equal to wallets + investments − credit cards.
- [x] 4.2 Extend `apps/web/e2e/dashboard.spec.ts`: the breakdown chart shows slices
      for positive-balance wallets and positive-value investment holdings, excludes
      zero/negative ones, and never shows a credit card as a slice even when the
      user has a card with a positive balance.
- [x] 4.3 Extend `apps/web/e2e/dashboard.spec.ts`: the dashboard's contributing-totals
      summary shows the wallets, investments, and credit card totals as separate
      labeled values.
- [x] 4.4 Extend `apps/web/e2e/wallets.spec.ts`: `/wallets`' own total is labeled as
      a wallets total, not "Net worth".

## 5. Docs

- [x] 5.1 Remove the `net-worth-aggregation` row from `.docs/product/roadmap.md`'s
      "Up next" table once this change is applied.

## 6. Verification

- [x] 6.1 Run `bun run lint && bun test && bun run build` locally before calling this
      change done (no CI yet — see `CLAUDE.md`).
- [x] 6.2 Run `bun run test:e2e` for the new/updated dashboard and wallets specs.
