## Why

`credit-cards-core` and `credit-card-installments` shipped a credit card as a place to
log charges, but the two fields that would make a card behave like a credit card —
`statementCloseDay`/`dueDay` and a charge's `pending`/`posted` `status` — are stored and
displayed only; nothing computes a cycle, a due date, or a statement total from them, and
the `credit-cards` spec says so explicitly ("inert until `credit-card-statements` gives
them cycle behavior"). Without this, the card domain is just an expense list with a
running total — the two things a card user actually needs to act on ("what's due, and by
when" and "pay it down") don't exist. Both prior changes' proposals and the `credit-cards`
spec name this change as their intended follow-up; nothing shipped since has absorbed or
removed the need for it.

## What Changes

- Compute a card's statement cycle from its `statementCloseDay`: an **open cycle**
  (charges since the last close, still accumulating) and the **most recently closed
  cycle** (its charges are fixed, awaiting payment), plus that closed cycle's due date
  derived from `dueDay` (rolled to the correct month relative to the close date).
- A charge's `status` becomes meaningful: only **posted** charges dated within a cycle
  count toward that cycle's statement total; a **pending** charge is excluded from any
  closed statement's total until it posts, regardless of its `date`. This is additive —
  `balance` (total amount owed) keeps counting every charge exactly as it does today
  (per the existing `credit-cards` requirement); the cycle math produces a second,
  narrower number ("what's due this statement") alongside it.
- `apps/web`: `/credit-cards` and `/credit-cards/[id]` surface the closed statement's
  total and due date alongside the existing running balance.
- New: a signed-in user can **pay a credit card from a wallet** — reduces the card's
  `balance` and the wallet's `balance` atomically, in one action. This is a transfer
  between two of the user's own domains, not new spending or income, and is distinct
  from logging an expense. Per the product doc's speed principle, paying a card is a
  frequent action for anyone carrying a balance and gets its own low-friction
  interaction (a sheet, not a page navigation) — exact entry point (shortcut vs.
  contextual button on the card page) is a design decision.
- Installments need no special-casing: a future-dated installment leg is classified into
  whichever cycle its `date` (and, once posted, its `status`) puts it in, using the same
  rule as any other charge — statement math only ever looks at `date`/`status`/`cardId`
  on the existing `transaction` row.

## Capabilities

### New Capabilities
- `credit-card-statements`: statement cycle computation (open vs. most-recently-closed
  cycle, due date), the closed cycle's statement total, and paying a card from a wallet.

### Modified Capabilities
- `credit-cards`: "A credit card's balance reflects its charges" currently states that,
  after creation, charges are "the only way a card's `balance` changes" — this changes to
  also reflect a payment (this change's new requirement).
- `wallets`: "A wallet's balance reflects its transactions" extends to also reflect a
  credit card payment made from that wallet.

## Impact

- `apps/api`: `modules/credit-cards/` (per the roadmap's module mapping — no new module)
  gains statement-cycle queries (deriving open/closed cycle boundaries and the statement
  total from `statementCloseDay`/`dueDay` and existing charge rows — no new schema
  needed for the cycle math itself) and a pay-card-from-wallet command that updates both
  `wallet.balance` and `creditCard.balance` atomically, following the existing
  cross-table precedent in `modules/transactions/repositories/transactions-repository.ts`
  (`TransactionsRepository` already reaches directly into both the shared `wallet` and
  `credit_card` tables rather than routing through their owning modules). Whether a
  payment is recorded as a new kind of `transaction` row, a new dedicated table, or
  something else is a design decision — the existing `transaction_exactly_one_destination`
  check constraint (wallet XOR card) doesn't fit a two-sided payment as-is.
- `apps/web`: `modules/credit-cards/` gains the statement total/due-date display and a
  payment sheet/flow; `modules/transactions/` may need a "credit card payment" row
  treatment if payments end up visible in existing transaction lists (design decision).
