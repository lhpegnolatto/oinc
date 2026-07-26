## Context

A credit card today (`credit-cards-core`, `credit-card-installments`) stores
`statementCloseDay`/`dueDay` and a charge's `pending`/`posted` `status`, but nothing
reads them — `balance` is a single running total incremented/decremented by every
charge regardless of date or status. `TransactionsRepository` already has an
established precedent for a balance-affecting write reaching directly into a shared
table it doesn't own (`wallet` and `creditCard` are both touched from the
`transactions` module, never through `wallets`'/`credit-cards`' own commands) — this
change's payment feature follows the same precedent in the other direction.

The one structural wall this change runs into: `transaction.categoryId` is
`NOT NULL` and every card-destination row is assumed to be a charge (`cardBalanceDelta`
is an unconditional `+amount` — see `credit-cards-core` design Decision 3, "no
income-type card charges in this change"). A payment is not a charge — it has no
spending category, and it must *decrease* what's owed, not increase it. Forcing it into
`transaction` would mean either a nullable `categoryId` (weakening a constraint every
other part of the codebase relies on) or a fake "Payment" system category (which would
then leak into category-based spending totals — see Decision 1 below for why that
matters more than it first appears).

## Goals / Non-Goals

**Goals:**
- Compute, on read, a card's open cycle and most-recently-closed cycle from
  `statementCloseDay`, and the closed cycle's due date from `dueDay` — no new schema
  for the cycle boundaries themselves.
- A closed cycle's statement total counts only `posted` charges dated within it;
  `pending` charges (regardless of date) and charges dated in the still-open cycle are
  excluded. `balance` (total owed) is unaffected by any of this — it keeps summing
  every charge exactly as it does today.
- A signed-in user can pay a card from a wallet they own: one atomic action that
  decreases the card's `balance` and the wallet's `balance` by the same amount.
- Statement math and installments compose for free: an installment leg is just a
  `transaction` row with a `date` and (implicitly) `posted` status, so it's classified
  by the same rule as any other charge — no installment-aware branching anywhere in
  this change.

**Non-Goals:**
- Attributing a payment to a specific statement, tracking over/under-payment, minimum
  payments, or interest/fees on a carried balance — `balance` stays a single number;
  a payment just moves it, the same shallow way a charge does today.
- Editing a payment — create/delete only (mirrors how a wallet/card's `balance` itself
  has no direct edit, only side-effecting operations). If the amount was wrong, delete
  and re-record it.
- Payments appearing in a wallet's own transaction list (`/wallets/[id]`) or the
  all-wallets `/transactions` list — only the wallet's `balance` reflects a payment,
  the same way a card charge today updates a wallet's... (n/a) — more precisely: this
  mirrors `credit-cards-core` Decision 4, where a card charge is invisible to
  `/transactions` "for free" because that query inner-joins `wallet`. A payment being
  invisible to the same list is the same kind of gap, now on the wallet side. A unified
  "money movement" list spanning transactions and payments is future work, not this
  change.
- Reminders/notifications tied to the due date.
- A funds-sufficiency check on payment amount (e.g. rejecting a payment larger than the
  card's balance, or larger than the wallet's balance) — logging a wallet expense today
  has no equivalent "can you afford this" check, so a payment doesn't get one either,
  for consistency.
- Per-user timezone handling for cycle-boundary math — matches every other date field
  in the app today (plain `date` columns, server-clock "today"); not a new gap this
  change introduces.

## Decisions

### 1. A payment is a new `credit_card_payment` entity, not a `transaction` row

```ts
// shared/db/schema/credit-card-payments-schema.ts
export const creditCardPayment = pgTable(
  "credit_card_payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id").notNull().references(() => creditCard.id, { onDelete: "cascade" }),
    walletId: text("wallet_id").notNull().references(() => wallet.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull(),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("credit_card_payment_cardId_idx").on(table.cardId),
    index("credit_card_payment_walletId_idx").on(table.walletId),
    index("credit_card_payment_userId_idx").on(table.userId),
    index("credit_card_payment_cardId_date_idx").on(table.cardId, table.date),
    index("credit_card_payment_walletId_date_idx").on(table.walletId, table.date),
  ],
);
```

**Alternative considered**: a two-row pair — a wallet-destination `transaction` (a new
"transfer" type, or an `expense` against a synthetic "Card Payment" category) plus a
card-destination row with a negative-style balance effect. Rejected on two independent
grounds: (a) it requires either loosening `categoryId`'s `NOT NULL` or inventing a
system category, and a synthetic category would then show up in `spending-insights`
(roadmap item 8) as real expense volume — double-counting money that was already
counted as spending when the original charge posted; (b) it requires `cardBalanceDelta`
to branch on "is this row a charge or a payment," undoing the simplicity
`credit-cards-core` Decision 3 deliberately chose (an unconditional `+amount`). A
dedicated table with no `categoryId` at all makes "a payment is structurally not
spending" true by construction instead of by convention.

### 2. Statement cycle boundaries and totals are computed at read time, not stored

```ts
// modules/credit-cards/queries/get-card-statement.ts (sketch)
function mostRecentCloseDate(today: Date, closeDay: number): Date {
  const candidate = new Date(today.getFullYear(), today.getMonth(), closeDay);
  return candidate > today
    ? new Date(today.getFullYear(), today.getMonth() - 1, closeDay)
    : candidate;
}
// open cycle:   (mostRecentClose, nextClose]
// closed cycle: (previousClose, mostRecentClose]
// due date: first occurrence of dueDay strictly after mostRecentClose
//   (same month if dueDay > statementCloseDay, else next month)
```
JS `Date`'s native month-rollover handles short months the same way
`credit-card-installments` Decision 5 already accepted for installment dates (e.g.
`closeDay: 31` in a 30-day month lands on the 1st of the next — no bespoke
day-clamping helper). The closed cycle's statement total is
`sum(amount) where cardId = X and status = 'posted' and date in (previousClose, mostRecentClose]`
— a query against existing `transaction` rows, no new columns on `transaction` or
`credit_card`. This keeps the migration to exactly one new table (Decision 1) and means
a charge's classification updates automatically the moment its `status` flips from
`pending` to `posted` via the existing `update-transaction` path — nothing needs to
"recompute" anything.

**Alternative considered**: a `credit_card_statement` table, materialized on cycle
close (e.g. via a cron/scheduled job) recording each cycle's total and due date as
committed facts. Rejected for this pass — it introduces a scheduled-job dependency
this codebase doesn't have anywhere yet, and "what's due this cycle" is cheap to
compute from existing rows on every read. Worth revisiting only if a future change
needs a statement to be an immutable historical record independent of later edits to
its charges (not a requirement today).

### 3. Payment write path: lock both rows FOR UPDATE, ordered, in one DB transaction

Mirrors `TransactionsRepository.updateWithBalanceUpdate`'s existing two-destination
locking (sort the two ids, lock in that order, to avoid deadlocking against a
concurrent operation moving money the opposite direction between the same two rows).
`CreditCardPaymentsRepository.createWithBalanceUpdate` locks `wallet` and `creditCard`
in id-sorted order, verifies both are owned by the requesting user, inserts the
payment row, decrements `creditCard.balance`, decrements `wallet.balance` — all in one
`db.transaction(...)`. `deleteWithBalanceUpdate` reverses both deltas the same way
`TransactionsRepository.removeWithBalanceUpdate` does for a charge.

This is the third place in the codebase implementing "lock two shared-table rows in
id-sorted order, then apply signed deltas" (the other two: `updateWithBalanceUpdate`'s
wallet-move and card-move branches). Not extracting a shared helper in this change —
each call site's rows and deltas differ enough (wallet+wallet, card+card, wallet+card)
that a premature abstraction would cost more than the ~15 lines it'd save. Worth
revisiting if a fourth call site appears.

### 4. `credit-cards` module owns the payment write path (not a new module)

Per the roadmap's own module mapping for this row (`api/web: credit-cards`),
`CreditCardPaymentsRepository`/commands/queries live in `modules/credit-cards/`,
reaching directly into the shared `wallet` table for the wallet-side balance update —
the same "shared-table access from a module that doesn't own that table" pattern
`transactions` already established for `creditCard`. `modules/transactions/` is
untouched by this change (no new columns, no new command).

### 5. No new keyboard shortcut for "pay a card" — a contextual button + sheet on `/credit-cards/[id]`

The product doc's "fast is a feature" shortcut requirement applies to *frequent*
actions — logging a charge happens many times a day, which is why it has one (`n`).
Paying a card down is roughly a once-per-cycle action. A "Pay card" button on
`/credit-cards/[id]` opening a sheet (wallet picker + amount, pre-filled with the
closed cycle's statement total, editable) satisfies the low-friction-interaction half
of the rule without adding shortcut sprawl for an infrequent action — consistent with
how that page already has a scoped "Log charge" button distinct from the global
shortcut.

## Risks / Trade-offs

- **[Risk]** Two now-separate "money movement" write paths (`transaction`,
  `credit_card_payment`) both affect a wallet's `balance`. → **Mitigation**: a
  payment's complete absence of `categoryId` makes it structurally impossible for it to
  leak into any category-scoped query (spending-insights, per-category totals) —
  future work there only needs to know payments exist, not filter them out.
- **[Trade-off]** No per-statement payment attribution (Non-Goal) means a user can't
  see "did I pay off last cycle's amount, or overpay/underpay" — only the running
  `balance`. Accepted per the shallow mandate; revisit only if a real user need for it
  shows up.
- **[Risk]** Computing the statement total on every read (rather than storing it) means
  a card with an unusually large charge history does a range-scan each time
  `/credit-cards/[id]` loads. → **Mitigation**: the query is indexed
  (`credit_card_cardId_date_idx` already exists from `credit-cards-core`) and scoped to
  one cycle's date range — bounded by design, not by row count.
- **[Risk]** Payments not appearing in `/wallets/[id]`'s transaction list could read as
  a missing feature rather than a deliberate scope cut. → **Mitigation**: called out
  explicitly as a Non-Goal here and should be called out again in the wallets delta
  spec, so it's traceable rather than silently absent.

## Migration Plan

1. Add `credit_card_payment` table (Decision 1) — brand-new table, no existing-column
   changes, so no backfill and nothing to break for existing rows.
2. Generate via `drizzle-kit generate`, review the SQL, apply locally.
3. No changes to `transaction` or `credit_card` schema — statement cycle math is
   entirely computed (Decision 2).
4. Rollback: drop the new table; nothing else to unwind.

## Open Questions

- Exact placement of the statement total/due date on `/credit-cards` (list view — a
  per-card badge?) vs. `/credit-cards/[id]` (a dedicated section) is left to
  implementation; functionally it just needs to be visible on both per the proposal.
- Should a payment support a `note` field for parity with a transaction's optional
  note? Leaning yes (schema above includes it) since it's free to add and consistent
  with every other money-movement entity in the app.
