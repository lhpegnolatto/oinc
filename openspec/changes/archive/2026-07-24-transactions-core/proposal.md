## Why

Wallets exist but are static — a user can create one with a starting balance and rename
it, but has no way to log the day-to-day money moving in and out. Transactions are the
highest-frequency action the product exists for, and the first capability that has to
prove out the speed pattern (shortcut + sheet) the rest of the product will follow.

## What Changes

- New `apps/api` module `transactions`: create/update/delete commands and list/get
  queries, scoped to a wallet the requesting user owns.
- Each transaction create/update/delete atomically updates its wallet's `balance` in the
  same DB transaction as the transaction write (row-locked to prevent races) — **BREAKING**
  in the sense that `wallet.balance` is no longer fixed after creation, only settable via
  wallet update. See modified capability below.
- New category support nested in the `transactions` module: a small fixed, system-seeded
  set plus user-owned custom categories, each typed `income` or `expense` and carrying a
  color/icon appearance (same treatment as wallets).
- New `apps/web` module `transactions`: a quick-add sheet reachable both via a global
  keyboard shortcut (`n`) from anywhere in the private app and via a persistent quick-add
  affordance — no page navigation, per the product doc's speed principle.
- New private route `/wallets/[id]` — the first place a single wallet's transaction list
  is shown; wallet cards on `/wallets` become links into it.

## Capabilities

### New Capabilities
- `transactions`: create/update/delete/list a wallet's transactions, the wallet-balance
  side effects of each, and the quick-add shortcut/sheet UX.
- `transaction-categories`: the fixed system category set, user-owned custom categories,
  their income/expense typing and appearance, and edit/delete rules.

### Modified Capabilities
- `wallets`: `balance` is no longer immutable after creation — it now also moves via
  transaction create/update/delete. The existing "balance is not editable through wallet
  update" requirement stays true (transactions are the only path that moves it), but the
  capability's balance-mutability assumptions need updating to reflect that.

## Impact

- `apps/api`: new `modules/transactions/{controllers,commands,queries,repositories,domain,schemas}`;
  new `shared/db/schema` tables `transaction` and `category`; new Drizzle migration
  (`drizzle-kit generate`); `shared/db/schema` index barrel updated.
- `apps/api` module boundary: the `transactions` module writes to the `wallet` row for
  balance bookkeeping. It must do so via the shared `wallet` table import (not by
  importing `wallets`' repository/commands/domain), so the two modules stay
  independent per `backend.md` while still sharing one Postgres transaction for
  atomicity — documented as a deliberate, narrow exception in `design.md`.
- `apps/web`: new `modules/transactions/{components,hooks,schemas,lib,api.ts}`; new
  `app/(private)/wallets/[id]/page.tsx`; a new shared keyboard-shortcut mechanism (none
  exists yet) likely rooted in `app/(private)/layout.tsx`.
- No changes to `packages/env`, auth, or other existing modules' schemas.
