## Why

Wallets, transactions, and credit cards now cover cash and credit — but a user's net
worth isn't complete without what they hold outside of cash (brokerage-style
positions). `investments-core` adds manual tracking for that, deliberately shallow per
`.docs/product/overview.md`'s non-goals: no live market data, no tax-lot accounting, no
portfolio analytics. It's the last domain `net-worth-aggregation` (next in the roadmap)
needs before it can roll up a single net-worth number.

## What Changes

- New `investments` capability: a signed-in user can create, list, update, and delete
  investment holdings — each with a name, an appearance (color/icon, matching
  wallets/cards), optional `quantity`/`costBasis`, and a required `currentValue` that
  the user updates by hand whenever they check their actual position elsewhere.
- Holdings are **fully decoupled from wallets** — creating or updating a holding never
  moves a wallet balance. If a user wants the cash outflow reflected, they log an
  ordinary expense transaction themselves; that's an existing capability, not new
  scope here.
- No history/snapshot table — `currentValue` is overwritten in place, the same way a
  wallet's `color`/`name` is edited in place. A trend view, if ever needed, is
  `net-worth-aggregation`'s problem to solve, not this change's.
- When `quantity`, `costBasis`, and `currentValue` are all present, the UI shows a
  simple unrealized gain/loss (`currentValue − costBasis`) — a single subtraction, not
  computed analytics.
- `/investments` page (list + create/edit/delete), following the same page shape as
  `/wallets` and `/credit-cards`.

## Capabilities

### New Capabilities
- `investments`: manual brokerage-style holdings — CRUD, appearance, optional
  quantity/cost basis, manually-updated current value, and a derived unrealized
  gain/loss when the inputs support it.

### Modified Capabilities
(none — dashboard/net-worth rollup is out of scope here, reserved for
`net-worth-aggregation`)

## Impact

- **api**: new `apps/api/src/modules/investments/` (controllers, commands, queries,
  repositories, domain, schemas), new `investment` table in
  `apps/api/src/shared/db/schema/` with a Drizzle migration.
- **web**: new `apps/web/src/modules/investments/`, new
  `apps/web/src/app/(private)/investments/` route.
- No changes to `wallets`, `transactions`, or `credit-cards` modules — investments
  stay isolated from them, per Model 1 in this change's `design.md`.
- Not a frequent action (unlike logging a transaction) — creating/updating a holding
  uses a dialog like wallet creation, not a sheet+shortcut; `design.md` states this
  explicitly as the deliberate "no shortcut" case the product doc calls for.
