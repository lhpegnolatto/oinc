## Context

`wallets-crud` shipped `wallet.balance` as a persisted `numeric(14,2)` column, set once at
creation and explicitly *not* editable through the wallet update endpoint — the wallets
spec deferred "balance movement" to this change. This change is also the first one to
need a keyboard-shortcut mechanism in `apps/web` (none exists yet) and the first to
introduce a second aggregate (`category`) alongside a primary one (`transaction`) inside a
single module, per the roadmap's explicit choice to nest categories here rather than give
them their own module.

Relevant existing patterns this design builds on directly:
- `modules/wallets` end to end (commands/queries/repositories/domain/schemas split,
  `crypto.randomUUID()` ids, ownership-scoped repository methods, `WalletNotFoundError`).
- `shared/validation/wallet-appearance.ts`, exported to `apps/web` via the
  `@oinc/api/wallet-appearance` subpath — the existing color/icon validation + rendering
  pattern this change extends for categories.
- `apps/web/src/modules/wallets/lib/format-currency.ts` and `wallet-color-presets.ts` —
  generic enough that a second consumer (transactions) justifies promoting them rather
  than duplicating.

## Goals / Non-Goals

**Goals:**
- Creating, editing, and deleting a transaction keeps `wallet.balance` correct, atomically,
  under concurrent access.
- The quick-add flow is fast: a global shortcut plus a sheet, reachable from anywhere in
  the private app, per the product doc's speed principle.
- Categories are simple: a small fixed set anyone can use, plus user-owned custom ones,
  with the same appearance treatment wallets already have.

**Non-Goals:**
- No audit trail / point-in-time balance snapshots — editing or deleting a transaction is
  a hard mutation, consistent with the product's non-goal of no double-entry accounting.
- No pagination on the per-wallet transaction list in this slice.
- No "remember last used wallet" default for the quick-add sheet.
- No category name-uniqueness enforcement.
- No dashboard aggregation work — `/wallets/[id]` is the only new surface; the dashboard
  stub is untouched (that's `dashboard-overview`, roadmap #3).

## Decisions

### 1. `wallet.balance` stays a write-through cache, mutated inside the transaction's own DB transaction

Every create/update/delete of a `transaction` row locks its wallet(s) with
`SELECT ... FOR UPDATE` and updates `balance` in the *same* Postgres transaction as the
row write. Rejected alternative: deriving balance as `SUM(transactions.amount)` at read
time — correct by construction, but it would repurpose the already-shipped `balance`
column's meaning (needing a new `startingBalance` column and a migration of existing
values) for a correctness benefit this app's single-user read volume doesn't need. It also
sets a worse precedent for `credit-cards-core` (roadmap #4/#5), where statement balances
are inherently running/cached values, not sums.

**Module boundary**: the `transactions` module's repository updates the `wallet` row by
importing the `wallet` table from the *shared* `shared/db/schema` barrel — never `wallets`'
repository, commands, or domain types. This keeps the two modules independent per
`backend.md` (no module reaches into another module's internals) while still allowing one
atomic DB transaction, which cross-module command composition at the controller layer
cannot provide (that would mean two separate Postgres transactions, reopening the race
this design closes). This is a deliberate, narrow exception, not a precedent for modules
reading/writing each other's tables freely — only balance bookkeeping crosses this line.

### 2. Sign convention: `type` enum + always-positive `amount`

`transaction.type` is `"income" | "expense"` (Postgres enum); `amount` is stored as a
positive `numeric(14,2)`, matching `wallet.balance`'s precision. The wallet-balance delta
applied is `+amount` for income, `-amount` for expense. Rejected alternative: a single
signed `amount` with no `type` column — marginally fewer columns, but pushes sign-handling
into every consumer (UI input, category filtering, future reporting) instead of a single
enum a category's own `type` can be validated against directly.

### 3. Category model

- `category.userId` is nullable: `null` = system-seeded (visible to everyone, not
  editable/deletable by any user), non-null = a user's own custom category
  (editable/deletable by its owner only).
- Every category has a fixed `type` (`income` | `expense`); a transaction's `categoryId`
  must reference a category whose `type` matches the transaction's own `type` — enforced
  in the create/update command, not just the UI filter.
- Appearance (`color`, `icon`) reuses wallets' hex-color validation, factored out of
  `shared/validation/wallet-appearance.ts` into `shared/validation/appearance.ts` (hex
  regex + schema + swatch presets are domain-agnostic), while categories get their own
  curated icon enum (`CATEGORY_ICON_KEYS`, exported via a new `@oinc/api/category-appearance`
  subpath) — the icon *vocabulary* differs from wallets' even though the color logic
  doesn't.
- System categories get stable, deterministic ids (e.g. `"system-food"`, not
  `crypto.randomUUID()`), seeded via SQL appended after the `drizzle-kit generate`
  migration for the new tables, using `ON CONFLICT DO NOTHING` so the seed is idempotent
  across environments. Exact fixed-category list is a tasks-level detail, not architectural.
- Deleting a custom category that has ≥1 transaction referencing it is rejected with a
  domain `CategoryInUseError` (checked explicitly in the command via a count query, not by
  parsing a Postgres FK-violation error) — no cascade/reassignment to an "Uncategorized"
  fallback. Keeps this slice simple; the user recategorizes first.

### 4. IA: `/wallets/[id]`

New private route showing one wallet's header (name/balance/appearance, reusing existing
wallet components) plus its transaction list and an "Add transaction" entry point. Wallet
cards on `/wallets` become links into it. This is the first "scoped to a wallet" surface
the roadmap calls for — the dashboard (roadmap #3) is out of scope here.

### 5. Shortcut + sheet UX

A new generic `apps/web/src/hooks/use-keyboard-shortcut.ts` (shared, not
transactions-specific, since future modules will want shortcuts too) is registered once in
`app/(private)/layout.tsx` to open the quick-add sheet from anywhere in the private app,
bound to `n` (the product doc's own example). It ignores keydown when
`document.activeElement` is an editable element or a modifier key is held, so it never
hijacks typing or OS/browser shortcuts.

Wallet defaulting in the sheet: opened from `/wallets/[id]`, the wallet field is
pre-filled with that wallet (still changeable, matching the create-wallet dialog's
"pre-filled but editable" pattern); opened anywhere else, the wallet field starts unset
and required. No cross-session "last used wallet" memory in this slice.

### 6. DB-transaction shape per command

- **Create**: lock the target wallet `FOR UPDATE` (this query also proves ownership —
  no row means `WalletNotFoundError`); insert the transaction row; apply the signed delta
  to `balance`.
- **Update**: lock the current wallet and, if the wallet is being changed, the target
  wallet too — both locks acquired in a fixed order (sorted by id) to avoid deadlocking
  against a concurrent edit moving a transaction the opposite direction between the same
  two wallets. Reverse the old delta from the old wallet, apply the new delta to the
  new/same wallet, then update the row.
- **Delete**: lock the wallet `FOR UPDATE`, reverse the delta, delete the row.

All three scope by `userId` the same way wallets' commands already do, throwing
`TransactionNotFoundError` / `WalletNotFoundError` (never revealing existence of another
user's data) on a mismatch.

### 7. Frontend promotions

`format-currency.ts` and the color-preset list move from `modules/wallets/lib/` to a
shared `apps/web/src/lib/` location — both are already domain-agnostic, and transactions
is a concrete second consumer today, not a hypothetical one.

## Risks / Trade-offs

- **Concurrent writes to the same wallet** (two tabs, or a create racing an edit) →
  mitigated by `SELECT ... FOR UPDATE` serializing writers inside one DB transaction.
- **Cross-wallet edit deadlock** (two concurrent edits locking two shared wallets in
  opposite order) → mitigated by always acquiring wallet locks in a fixed (id-sorted)
  order.
- **No pagination on the transaction list** → could get slow for a long-lived wallet with
  years of history. Accepted for this slice given the single-user target scale; revisit if
  `spending-insights` (roadmap #8) surfaces real pain.
- **Category deletion blocked when in use** → minor friction if a user wants to prune a
  mistakenly-created category. Acceptable: recategorizing is a rare, one-time action, not
  one of the frequent actions this doc optimizes speed for.
- **Global `n` shortcut** → could theoretically conflict with a future in-app text flow.
  Mitigated by the editable-element/modifier-key guard; revisit if a conflict actually
  surfaces.

## Migration Plan

Additive only: two new tables (`category`, `transaction`) via `drizzle-kit generate`, plus
a hand-appended idempotent SQL seed for the fixed system categories. No existing table's
*structure* changes — `wallet.balance`'s behavior changes (it's now also written by the
`transactions` module), but its column definition doesn't. Rollback is dropping the two new
tables; existing wallets/users data is untouched either way.

## Open Questions

- Exact fixed system-category list (names/icons/colors, expense vs income split) — a
  product-taste call to finalize during implementation, not an architectural one.
- Whether category name uniqueness (per user + type) should eventually be enforced — left
  unenforced here; revisit if duplicate categories prove annoying in practice.
