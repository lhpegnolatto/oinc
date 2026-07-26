## 1. Schema migration

- [x] 1.1 Add `credit_card_payment` table to a new
      `shared/db/schema/credit-card-payments-schema.ts`: `id`, `userId` (FK, cascade),
      `cardId` (FK → `credit_card`, cascade), `walletId` (FK → `wallet`, cascade),
      `amount` (numeric, same shape as `transaction.amount`), `date`, `note` (nullable),
      timestamps (design.md Decision 1)
- [x] 1.2 Add indexes: `userId`, `cardId`, `walletId`, `cardId`+`date`, `walletId`+`date`
- [x] 1.3 Register the new table in `shared/db/schema/index.ts` and add its relations
      (to `user`, `creditCard`, `wallet`)
- [x] 1.4 Run `drizzle-kit generate`, review the generated SQL, apply it locally

## 2. Statement cycle computation (api)

- [x] 2.1 Add a pure date-math helper (e.g.
      `modules/credit-cards/domain/statement-cycle.ts`) computing, from
      `statementCloseDay`/`dueDay` and "today": the open cycle's start date, the closed
      cycle's date range, and the closed cycle's due date (design.md Decision 2) — no DB
      access, easily unit-testable in isolation
- [x] 2.2 Add a query (e.g. `queries/get-card-statement.ts`) that, given a card id,
      returns the cycle boundaries from 2.1 plus the closed cycle's statement total —
      `sum(amount)` from `transaction` where `cardId` matches, `status = 'posted'`, and
      `date` within the closed cycle's range
- [x] 2.3 Expose the statement (cycle dates, due date, statement total) on the existing
      credit card list/detail responses (`credit-card-response.schema.ts` and the
      controller paths that build it), alongside the existing `balance`
- [x] 2.4 Test: a card's statement total includes only posted charges dated within the
      closed cycle (spec: "A posted charge within the closed cycle counts toward its
      total")
- [x] 2.5 Test: a pending charge dated within the closed cycle is excluded from the
      total (spec: "A pending charge is excluded from the statement total until posted")
- [x] 2.6 Test: a posted charge dated in the still-open cycle is excluded from the
      closed cycle's total (spec: "A charge dated in the open cycle is excluded")
- [x] 2.7 Test: editing a charge's `status` from `pending` to `posted` changes whether it
      counts, the next time the statement is read (spec: "A charge posting later is
      reflected the next time the total is read")
- [x] 2.8 Test: due date falls in the same month when `dueDay > statementCloseDay`, and
      in the next month otherwise (spec: "Due date falls in the same/next month")

## 3. Credit card payments (api)

- [x] 3.1 Add `CreditCardPaymentsRepository` (`modules/credit-cards/repositories/`)
      with `createWithBalanceUpdate` — locks the target wallet and credit card rows
      `FOR UPDATE` in id-sorted order, verifies both are owned by the requesting user,
      inserts the payment row, decrements `creditCard.balance` and `wallet.balance`, all
      in one `db.transaction(...)` (design.md Decision 3)
- [x] 3.2 Add `deleteWithBalanceUpdate` — locks the payment row (proves ownership),
      reverses both balance deltas, deletes the row
- [x] 3.3 Add `findAllForCard(cardId)` ordered by `date` descending, for the payment
      history list
- [x] 3.4 Add a `create-credit-card-payment` command validating a positive `amount`, a
      `date`, and ownership of both the card and wallet before delegating to the
      repository
- [x] 3.5 Add a `delete-credit-card-payment` command delegating to the repository,
      returning not-found when the payment isn't owned by the requester
- [x] 3.6 Add `create-credit-card-payment.schema.ts` (amount, date, note, walletId) and
      a `credit-card-payment-response.schema.ts`
- [x] 3.7 Routes on the existing credit-cards controller: `POST
      /credit-cards/:cardId/payments` (create), `GET /credit-cards/:cardId/payments`
      (list), `DELETE /credit-card-payments/:id` (delete) — all behind `requireAuth`
- [x] 3.8 Test: paying a card succeeds, decreasing both the card's and wallet's balance
      by the payment amount (spec: "Paying a card succeeds")
- [x] 3.9 Test: paying a card owned by another user fails, no payment created, no
      balance changes (spec: "Paying a card the user doesn't own fails")
- [x] 3.10 Test: paying from a wallet owned by another user fails, no payment created,
      no balance changes (spec: "Paying from a wallet the user doesn't own fails")
- [x] 3.11 Test: a non-positive payment amount is rejected, no payment created (spec:
      "Paying with a non-positive amount fails")
- [x] 3.12 Test: deleting a payment reverses both balance effects (spec: "Deleting a
      payment reverses both balance effects")
- [x] 3.13 Test: deleting another user's payment fails, nothing removed, no balance
      changes (spec: "Deleting another user's payment fails")
- [x] 3.14 Test: payment history is scoped to the requesting card/user, and requesting
      another user's card payment history fails not-found (spec: "Payment history is
      scoped...", "Requesting another user's card payment history fails")
- [x] 3.15 Test: deleting a credit card also deletes its payments; deleting a wallet
      also deletes credit card payments sourced from it (spec: "Deleting a credit card
      deletes its payments too", "Deleting a wallet deletes its credit card payments
      too") — confirms the cascading FKs from 1.1 behave as specified

## 4. Statement + payment UI (web)

- [x] 4.1 Extend the credit-cards `api.ts`/query hooks to read the new statement fields
      (cycle dates, due date, statement total) already present on the list/detail
      responses (task 2.3) — no new endpoint call needed for these
- [x] 4.2 `credit-card-card.tsx` (list view): show the closed statement's total and due
      date alongside the existing balance
- [x] 4.3 `credit-card-detail-page.tsx`: show the closed statement's total and due date
- [x] 4.4 Add a "Pay card" button on `/credit-cards/[id]` opening a new
      `pay-credit-card-sheet.tsx`: a wallet picker (reusing `useWalletsQuery`), an
      amount field pre-filled with the closed statement's total (editable), an optional
      date and note
- [x] 4.5 Add `use-create-credit-card-payment-mutation.ts` and
      `use-delete-credit-card-payment-mutation.ts`, invalidating the card's detail query
      and the wallet's balance-affecting queries on success
- [x] 4.6 Add a `payment-list.tsx`/`payment-list-item.tsx` (or equivalent) rendering the
      card's payment history on `/credit-cards/[id]`, separate from the existing charge
      list, each with its own delete action (no edit — design.md Non-Goal)
- [x] 4.7 Add an empty state for the payment history section when a card has no
      payments yet
- [x] 4.8 Test: paying a card from `/credit-cards/[id]` updates the displayed balance
      and statement total, and the payment appears in the payment history (spec: "A
      signed-in user can pay a credit card from a wallet they own", browser/Playwright
      tier per testing.md)

## 5. Final checks

- [x] 5.1 `bun run lint && bun test && bun run build` passes across the monorepo
- [x] 5.2 Manually walk the flows in a browser: view a card's statement total/due date
      on both `/credit-cards` and `/credit-cards/[id]`; log a pending charge and confirm
      it's excluded from the statement total until marked posted; pay a card from a
      wallet and confirm both balances update and the payment shows in the payment
      history; delete a payment and confirm both balances are restored; delete a card
      (or wallet) with payments and confirm they're removed too
