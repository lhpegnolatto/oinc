## Context

`credit-cards-core` (archived) built the `transaction` table's destination as nullable
`walletId` XOR `cardId`, with a `status` column meaningful only for card rows, and gave
card charges their own quick-add sheet (`QuickAddChargeSheet`) and shortcut (`c`),
separate from the wallet-scoped `QuickAddTransactionSheet` (`n`). Both write through the
same `TransactionsRepository.createWithBalanceUpdate`, which already locks the target
wallet-or-card row and applies a signed delta atomically — the backend has no concept of
"this is a wallet transaction" vs. "this is a card charge" beyond which FK is set. Only
the web layer forked into two flows.

Splitting a purchase into installments is a new requirement discovered after that change
shipped — it isn't on the roadmap under `credit-card-statements` (which only covers
close/due-date cycle behavior and paying a card from a wallet). Because a card charge is
already "just a transaction," the natural shape for an installment is a small series of
ordinary transactions that happen to share a label — not a new entity.

## Goals / Non-Goals

**Goals:**
- One "Add transaction" sheet/shortcut (`n`) for both a wallet and a credit card
  destination; the credit-card-only sheet/shortcut is removed.
- A signed-in user can split a card charge into `N` monthly installments; each
  installment is a first-class `transaction` row with its own balance effect, using the
  existing per-row balance-update mechanism unchanged.
- The card's `balance` reflects the full installment total immediately after the plan is
  created — matches how a real card statement treats an installment purchase as a
  standing commitment, not something that "arrives" later.
- Deleting one installment offers deleting just that row or deleting it and every
  remaining (future-dated) installment in the same plan.

**Non-Goals:**
- Statement-cycle awareness (which installment belongs to which statement, cycle
  rollover) — still `credit-card-statements`' job. Future-dated installment rows sit in
  the flat charge list exactly like any future-dated charge would today.
- Installments on wallet transactions — installments are a credit-card-specific
  concept; a wallet transaction's form is unchanged.
- Configurable installment cadence (weekly, custom day-of-month, etc.) — always exactly
  one installment per calendar month, starting on the submitted date.
- Editing an installment plan as a whole (changing its count or total after creation) —
  only per-row edits (like any transaction) and "delete this and remaining" are
  supported.
- Interest/fee modeling on installments — the total the user enters is split as-is, no
  APR or surcharge calculation.

## Decisions

### 1. One quick-add sheet, a destination toggle — the card-only shortcut is removed

`QuickAddTransactionSheet` gains a destination field (Wallet | Credit Card, rendered the
same way the existing Expense/Income toggle is). Selecting Credit Card:
- fixes `type` to `expense` and hides the Income/Expense toggle,
- reveals the `status` (`pending`/`posted`) field,
- reveals the installment-count field (see Decision 2).

`QuickAddTransactionProvider`'s path-match pre-fill generalizes: `/wallets/[id]` still
pre-fills a wallet destination, and `/credit-cards/[id]` now pre-fills a card
destination on the same provider/shortcut (`n`), instead of a second provider.
`QuickAddChargeProvider`, `QuickAddChargeSheet`, and the `c` shortcut registration are
deleted outright. `/credit-cards/[id]`'s "Log charge" button and `charge-list-item.tsx`'s
edit flow switch to the unified sheet.

**Alternative considered**: keep `c` as a fast-path that opens the same unified sheet
pre-set to Credit Card. Rejected — per `.docs/product/overview.md`'s "fast is a feature"
principle, the point of a shortcut is to be *the* well-known way to do a frequent action;
two shortcuts for what's now explicitly one action (per this change's proposal) adds a
thing to remember for no longer-justified reason once the sheet itself doesn't fork.

### 2. Installments: `installmentPlanId` + `installmentNumber`/`installmentCount` on `transaction`, no new table

```ts
// shared/db/schema/transactions-schema.ts additions
installmentPlanId: text("installment_plan_id"), // shared UUID across a plan's rows; null otherwise
installmentNumber: integer("installment_number"), // 1-based; null otherwise
installmentCount: integer("installment_count"), // total in the plan; null otherwise
```
All three are null for a non-installment transaction (wallet or card). No FK or separate
`installment_plan` table — a `installmentPlanId` is just a grouping value generated
client-side-of-the-command (`crypto.randomUUID()`), the same way a transaction's own
`id` already is. Indexed on `installmentPlanId` for the "delete remaining" query.

**Alternative considered**: a separate `installment_plan` table (total amount, count,
cadence) that `transaction` rows reference via FK. Rejected — nothing in this change
needs plan-level data beyond what's already implied by its member rows (count = distinct
rows with that plan id and `installmentCount`; total = sum of `amount`); a table with no
independent fields is pure overhead, and `credit-card-statements` can add one later if it
turns out to need plan-level state (e.g. an editable name) that doesn't fit on the row.

### 3. Installment creation reuses the existing per-row balance path unchanged, wrapped in one DB transaction for atomicity

`createCardChargeInstallmentPlan` (new command) validates the category and card
ownership once, computes `count` per-installment amounts (see Decision 4), then calls
`TransactionsRepository.createWithBalanceUpdate` once per installment — same method
`credit-cards-core` already built, completely unchanged — inside a single
`db.transaction(...)` wrapping all `count` inserts, so a mid-batch failure (e.g. a
concurrent card delete) rolls back every leg rather than leaving a partial plan. Balance
therefore ends up incremented by the sum of all installments as soon as the plan commits
— no new balance-accounting code path exists.

**Alternative considered**: give the plan a single balance-affecting "head" transaction
and `count - 1` non-balance-affecting "leg" rows. Rejected — it would require
`createWithBalanceUpdate` (and update/delete) to branch on "does this row affect
balance," a new kind of row the rest of the codebase (list queries, response schemas,
edit/delete) would have to special-case. Letting every row behave like an ordinary charge
is simpler and was explicitly the direction confirmed for this change ("each installment
is a transaction").

### 4. Amount split: even division with the remainder absorbed by the last installment

`amount / count`, rounded to 2 decimals, for installments `1..count-1`; installment
`count` = `total - sum(installments 1..count-1)`. This guarantees the sum always equals
the entered total exactly (no lost or invented cents from rounding), matching how
real-world installment billing reconciles a non-evenly-divisible total.

### 5. Dates: one per calendar month starting from the submitted date

Installment `n` (1-based) is dated `addMonths(submittedDate, n - 1)`. No day-of-month
clamping logic beyond what `Date` already does (e.g. submitting on the 31st and adding a
month to February lands on the last valid day per JS `Date` rollover) — acceptable for a
first pass since statement-cycle alignment isn't in scope (Non-Goal above).

### 6. Deleting an installment: per-row delete (existing path) plus a new "delete remaining" command

`deleteTransaction` (existing) still deletes exactly one row and reverses its own delta
— unchanged, used for "delete just this one." A new `deleteRemainingInstallments`
command/route deletes every row in the same `installmentPlanId` whose `date >=` the
target row's `date` (inclusive), reversing each one's delta the same way
`deleteWithBalanceUpdate` already does per-row, looped inside one DB transaction.
`apps/web`'s delete-charge confirmation dialog shows the second option only when the
charge being deleted has a non-null `installmentPlanId` and at least one later
installment still exists.

**Alternative considered**: a single bulk SQL delete + balance adjustment (one query
instead of a loop). Rejected for this pass — the loop reuses
`deleteWithBalanceUpdate`'s existing lock-then-reverse-then-delete logic per row
verbatim, which keeps the concurrency behavior identical to every other delete path in
the codebase; a bespoke bulk query would need its own locking argument re-derived from
scratch for a marginal performance gain on what's realistically a handful of rows (≤ a
few dozen installments).

### 7. Editing a single installment behaves exactly like editing any other charge

No special-cased fields, no restriction on changing `cardId`/`amount`/`date` on one leg
of a plan. Moving one installment to a different card, or changing its amount, makes it
inconsistent with its siblings' shared total — accepted as an edge case a user
deliberately choosing to do, not something this change needs to prevent; the plan's
`installmentNumber`/`installmentCount` remain on the row purely as a display label at
that point ("3/12"), not an enforced invariant.

## Risks / Trade-offs

- **[Risk]** Removing the `c` shortcut is a behavior change for anyone who already
  learned it during `credit-cards-core`. → **Mitigation**: it shipped very recently
  (same repo, no external users yet per the product's current stage), and the
  replacement (`n` with a destination toggle) is discoverable the same way the removed
  sheet was.
- **[Trade-off]** An edited or partially-deleted installment plan can drift from "N even
  installments" (per Decision 7) — e.g. deleting installment 2 of 5 leaves 1, 3, 4, 5
  with `installmentCount: 5` still label-displayed. Accepted: the count/number pair is a
  display label, not a referential-integrity guarantee, consistent with not having a
  separate plan table (Decision 2).
- **[Risk]** `deleteRemainingInstallments` loops per-row DB transactions rather than one
  bulk statement — on a very large plan this is more round-trips. → **Mitigation**:
  installment counts are realistically small (a handful to a few dozen); not worth the
  bespoke-locking complexity noted in Decision 6 for that scale.
