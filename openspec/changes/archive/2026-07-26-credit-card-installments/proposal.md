## Why

`credit-cards-core` shipped credit cards as a destination a transaction can point at, but
the web UX never followed through on that: logging a card charge requires a separate
quick-add sheet and shortcut (`c`) from logging a wallet transaction (`n`), even though
both write the same `transaction` row through the same backend path. That split forces a
user to remember two shortcuts for what's conceptually one action ("I spent money"), and
it leaves no room for a feature every credit-card user expects: splitting a purchase into
installments. Since a credit card is just another transaction destination, installments
are naturally just a small series of transactions sharing a label — this change unifies
the add-transaction UX first, then adds installments on top of it.

## What Changes

- **BREAKING** (UX, not API-compatibility-breaking): the credit-card-only quick-add
  shortcut (`c`) and its dedicated sheet (`QuickAddChargeProvider`/
  `QuickAddChargeSheet`, from `credit-cards-core`) are removed. The existing
  wallet-scoped "Add transaction" sheet (`n`) gains a destination toggle — Wallet or
  Credit Card — and becomes the single entry point for logging money movement
  regardless of destination. Selecting a credit card fixes `type` to `expense` and
  reveals a `pending`/`posted` status field, mirroring what the removed sheet did.
- A signed-in user can split a credit card charge into installments: submitting a
  charge with an installment count greater than 1 creates that many separate
  `transaction` rows, one per month starting from the given date, each with its own
  balance effect through the existing charge-creation path (no new balance logic) —
  so the card's `balance` reflects the full committed amount immediately, the same way
  a single charge would. The rows share an `installmentPlanId` and carry their own
  `installmentNumber`/`installmentCount` so the UI can label them ("3/12") and offer
  "delete this and all remaining installments" alongside the normal single-row delete.
- `/credit-cards/[id]`'s "Log charge" button and the pre-fill-from-current-card
  behavior are preserved — they now open the unified sheet with Credit Card
  pre-selected, instead of the removed dedicated sheet.

## Capabilities

### New Capabilities
(none — installments are a new requirement on the existing `credit-cards` capability,
not a new product surface)

### Modified Capabilities
- `transactions`: "A transaction can be logged without leaving the current screen"
  generalizes to a wallet-or-credit-card destination in one sheet, replacing the
  card-only shortcut previously specified under `credit-cards`.
- `credit-cards`: removes "A credit card charge can be logged without leaving the
  current screen" (superseded by the `transactions` change above); adds a new
  requirement for logging an installment purchase, and extends the existing
  edit/delete-charge requirements with installment-aware delete behavior.

## Impact

- `apps/api`: `shared/db/schema/transactions-schema.ts` gains nullable
  `installmentPlanId`/`installmentNumber`/`installmentCount` columns + an index on
  `installmentPlanId`, and a migration; `modules/transactions/` gains an
  installment-plan creation path (wraps N calls to the existing per-row
  balance-updating insert in one DB transaction) and a "delete remaining
  installments" command; no changes to the wallet-transaction or single-charge
  balance mechanics.
- `apps/web`: `modules/transactions/` — the quick-add sheet, its provider, and the
  edit sheet gain a destination toggle and installment-count field;
  `modules/credit-cards/` — `QuickAddChargeProvider`/`QuickAddChargeSheet` and the
  `c` shortcut registration are deleted; `credit-card-detail-page.tsx`'s "Log
  charge" button and `charge-list-item.tsx`'s delete flow are updated to use the
  unified sheet and the new delete-remaining option.
