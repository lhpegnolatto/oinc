## 1. Schema migration

- [x] 1.1 Add nullable `installmentPlanId` (text), `installmentNumber` (integer), and
      `installmentCount` (integer) columns to `transactions-schema.ts`'s `transaction`
      table
- [x] 1.2 Add an index on `installmentPlanId` (`transaction_installmentPlanId_idx`) for
      the "delete remaining installments" query
- [x] 1.3 Run `drizzle-kit generate`, review the generated SQL, apply it locally

## 2. Installment plan creation (api)

- [x] 2.1 Refactor `TransactionsRepository`'s balance-affecting insert logic so it can
      run inside an externally-supplied transaction handle, not only a fresh
      `this.db.transaction(...)` per call — needed so the installment-plan path below
      can wrap `count` inserts in one outer DB transaction (design.md Decision 3)
      without nesting a brand-new top-level transaction per row
- [x] 2.2 Extend the `Transaction` domain type and `TransactionsRepository`'s
      insert/select paths with the three nullable installment columns
- [x] 2.3 Add a command that creates an installment plan: validates the category
      (expense) and card ownership once, computes each installment's `amount` (total /
      count rounded to 2 decimals, remainder absorbed by the last installment — design.md
      Decision 4) and `date` (one per calendar month starting from the submitted date —
      design.md Decision 5), then inserts all `count` rows atomically, each applying its
      own balance delta through the refactored path from 2.1
- [x] 2.4 Extend `create-card-charge.schema.ts` with an optional installment `count`
      (integer, minimum 1, default 1)
- [x] 2.5 `POST /credit-cards/:cardId/charges`: `count <= 1` behaves exactly as today
      (single charge, response unchanged — a single charge object); `count > 1` creates
      the plan and returns the array of created charges
- [x] 2.6 Update `toTransactionResponse` to include `installmentPlanId`,
      `installmentNumber`, `installmentCount` (null for non-installment rows)
- [x] 2.7 Test: splitting a charge into installments creates `count` charges dated one
      per month, sharing an `installmentPlanId`, and the card's balance increases by the
      full total immediately (spec: "Splitting a charge into installments succeeds")
- [x] 2.8 Test: installment amounts sum exactly to the total when it doesn't divide
      evenly (spec: "Installment amounts sum exactly to the total")
- [x] 2.9 Test: a count of 1 or omitted creates a single non-installment charge with no
      `installmentPlanId`, unchanged from today's behavior
- [x] 2.10 Test: splitting a charge against another user's card fails, no charges
      created, no balance changes
- [x] 2.11 Test: splitting a charge with a non-expense category fails, no charges
      created
- [x] 2.12 Test: splitting a charge with a non-positive total or an invalid count fails,
      no charges created

## 3. Delete an installment and its remaining siblings (api)

- [x] 3.1 Add a `deleteRemainingInstallments` command: given a charge the user owns with
      a non-null `installmentPlanId`, delete it and every charge in the same plan dated
      on or after it, reversing each one's balance delta the same way the existing
      single-row delete does, looped inside one DB transaction (design.md Decision 6)
- [x] 3.2 Add a route for it (e.g. `DELETE /transactions/:id/remaining-installments`),
      behind `requireAuth`, reusing the existing not-found-for-both-cases error shape
- [x] 3.3 Test: deleting an installment and its remaining siblings removes them and
      reverses their balance effect, leaving earlier installments in the plan untouched
- [x] 3.4 Test: deleting another user's installment plan fails, nothing removed, no
      balance changes
- [x] 3.5 Test: the existing single-charge `DELETE /transactions/:id` still deletes only
      that one row when it belongs to an installment plan (no regression to the
      already-shipped single-delete path)

## 4. Unify "Add transaction" into one sheet + shortcut (web)

- [x] 4.1 Extend `transactionFormSchema` with a destination discriminator (wallet vs.
      credit card), a `status` field (required, defaulted `posted`, only meaningful for
      a card destination), and an optional installment `count`
- [x] 4.2 `QuickAddTransactionSheet`: add a Wallet/Credit Card destination toggle
      (mirrors the existing Expense/Income toggle's look). Selecting Credit Card fixes
      `type` to `expense`, hides the Expense/Income toggle, and reveals the `status` and
      installment-`count` fields; selecting Wallet restores the Expense/Income toggle
      and hides `status`/`count`. The destination `Select` below the toggle reads from
      `useWalletsQuery` or `useCreditCardsQuery` depending on the toggle
- [x] 4.3 `QuickAddTransactionSheet`'s submit handler calls the wallet-transaction
      mutation when the destination is a wallet, or the card-charge mutation (passing
      `count` when > 1) when it's a credit card
- [x] 4.4 `QuickAddTransactionProvider`: generalize the path-match pre-fill to also
      match `/credit-cards/[id]` and pre-select Credit Card as the destination with that
      card
- [x] 4.5 Delete `QuickAddChargeProvider`, `QuickAddChargeSheet`, and the `c` shortcut
      registration; remove the provider's mount from `app/(private)/layout.tsx`
- [x] 4.6 `credit-card-detail-page.tsx`'s "Log charge" button and `ChargeEmptyState`'s
      "Log charge" button call the unified provider's `open()` (via
      `useQuickAddTransaction`) instead of managing their own local sheet state
- [x] 4.7 Test: logging a wallet transaction and a card charge both work from the same
      quick-add sheet, reachable by the same shortcut, with the right fields showing for
      each destination (`bun test` tier: server-rendered assertions where possible;
      otherwise Playwright per testing.md's tiering)

## 5. Installment UI on the card charge list (web)

- [x] 5.1 `charge-list-item.tsx`: show an installment label ("3/12") when a charge has a
      non-null `installmentCount`
- [x] 5.2 `DeleteChargeDialog`: when the charge being deleted has a non-null
      `installmentPlanId` and at least one later installment remains, offer "delete this
      and remaining installments" alongside the existing single-delete option, calling
      the new remaining-installments delete endpoint
- [x] 5.3 Add the corresponding mutation hook (`use-delete-remaining-installments-
      mutation.ts`), invalidating the card's charge list and the credit cards list query
      on success

## 6. Final checks

- [x] 6.1 `bun run lint && bun test && bun run build` passes across the monorepo
- [x] 6.2 Manually walk the flows in a browser: log a wallet transaction and a card
      charge from the same "Add transaction" sheet/shortcut; confirm
      `/credit-cards/[id]`'s "Log charge" button and pre-fill still work through the
      unified sheet; split a charge into installments and confirm the card's balance
      jumps by the full total immediately and each installment is dated a month apart;
      delete a single installment vs. delete-remaining and confirm the balance and list
      reflect each correctly; confirm the `c` shortcut no longer does anything
