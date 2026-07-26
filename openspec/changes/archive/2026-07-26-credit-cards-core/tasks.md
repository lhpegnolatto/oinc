## 1. Schema migration

- [x] 1.1 Add `credit-cards-schema.ts`: `credit_card` table (`id`, `userId` FK
      cascade, `name`, `balance` numeric(14,2), `color`, `icon`,
      `statementCloseDay` int, `dueDay` int, timestamps), indexed on `userId`
      (`credit_card_userId_idx`)
- [x] 1.2 Add `transactionStatusEnum` (`pending`/`posted`) to
      `transaction-type-enum.ts` or its own file
- [x] 1.3 Alter `transactions-schema.ts`: drop `NOT NULL` on `walletId`, add nullable
      `cardId` (FK → `credit_card`, `onDelete: cascade`), add nullable `status`
      (`transactionStatusEnum`)
- [x] 1.4 Add indexes on the new columns: `transaction_cardId_idx`,
      `transaction_cardId_date_idx` (mirroring the existing wallet ones)
- [x] 1.5 Add the exactly-one-destination check constraint
      (`(wallet_id IS NOT NULL) <> (card_id IS NOT NULL)`) per design.md Decision 1
- [x] 1.6 Export the new table/enum from `shared/db/schema/index.ts`
- [x] 1.7 Run `drizzle-kit generate`, review the generated SQL, apply it locally
- [x] 1.8 Write a repository-level test confirming a direct insert with both
      `walletId` and `cardId` set (or neither set) fails at the DB layer (design.md
      Risk 1)

## 2. `credit-cards` module — card entity (api)

- [x] 2.1 Add `shared/validation/credit-card-appearance.ts` reusing `colorSchema`/
      `DEFAULT_COLOR` from `shared/validation/appearance.ts`, plus a curated icon
      schema reusing wallet's icon vocabulary (design.md Decision 5)
- [x] 2.2 `modules/credit-cards/domain/credit-card.ts` (entity type) and
      `credit-card-not-found-error.ts` (mirrors `wallet-not-found-error.ts` — same
      not-found-for-both-missing-and-not-owned shape)
- [x] 2.3 `modules/credit-cards/repositories/credit-cards-repository.ts`: `create`,
      `findAllForUser`, `update`, `delete` (mirrors `WalletsRepository`)
- [x] 2.4 `modules/credit-cards/commands/create-credit-card.ts`,
      `update-credit-card.ts`, `delete-credit-card.ts` (mirrors wallets' commands)
- [x] 2.5 `modules/credit-cards/queries/list-credit-cards.ts`
- [x] 2.6 `modules/credit-cards/schemas/`: `create-credit-card.schema.ts` (name,
      balance, statementCloseDay, dueDay required; color/icon defaulted),
      `update-credit-card.schema.ts`, `credit-card-id-param.schema.ts`,
      `credit-card-response.schema.ts`
- [x] 2.7 `modules/credit-cards/controllers/index.ts`: `POST /credit-cards`,
      `GET /credit-cards`, `PATCH /credit-cards/:id`, `DELETE /credit-cards/:id`,
      all behind `requireAuth` (mirrors `walletsRouter`)
- [x] 2.8 Mount `creditCardsRouter` in `app/routes.ts`
- [x] 2.9 Test: creating a card persists name/balance/appearance/statement fields
      (spec: "Creating a credit card succeeds")
- [x] 2.10 Test: creating a card with an empty name / invalid appearance / day field
      outside 1-31 is rejected (specs: appearance + statement-day requirements)
- [x] 2.11 Test: listing cards is scoped to the requesting user
- [x] 2.12 Test: renaming/updating appearance or statement fields leaves balance
      unchanged; updating another user's card 404s
- [x] 2.13 Test: deleting a card requires ownership and cascades to delete its
      charges (write a charge first, delete the card, assert the charge row is gone)

## 3. `transactions` module — generalize to a wallet-or-card destination (api)

- [x] 3.1 Add `cardBalanceDelta(amount)` alongside the existing `balanceDelta` in
      `TransactionsRepository` (design.md Decision 3 — flat add, no income/expense
      branch)
- [x] 3.2 Generalize `createWithBalanceUpdate` to accept either a `walletId` or a
      `cardId` destination: lock the target wallet or card row `FOR UPDATE` (proving
      ownership the same way), insert the transaction row, apply the matching delta
- [x] 3.3 Generalize `updateWithBalanceUpdate` to support card→card moves the same
      way it supports wallet→wallet moves today (lock old + new destination,
      dedupe/sort to avoid deadlock, reverse old delta, apply new delta) — do NOT
      support wallet↔card conversion (design.md Non-Goal)
- [x] 3.4 Generalize `deleteWithBalanceUpdate` to reverse the correct delta based on
      whether the deleted row's destination was a wallet or a card
- [x] 3.5 Add `findAllForCard(cardId)` (mirrors `findAllForWallet`)
- [x] 3.6 Update `createTransaction`/`updateTransaction`/`deleteTransaction` commands'
      input types to accept the destination union; category validation
      (`findVisibleCategory` + type match) unchanged but charge `type` is fixed to
      `expense` when the destination is a card (design.md Decision 3)
- [x] 3.7 Add `create-card-charge.schema.ts` (or extend the existing transaction
      schema) requiring `expense` type implicitly, plus optional `status` defaulting
      to `posted`
- [x] 3.8 Add routes to `transactionsRouter`: `POST /credit-cards/:cardId/charges`,
      `GET /credit-cards/:cardId/charges` (mirrors the `/wallets/:walletId/transactions`
      shape — design.md Decision 2); generalize `PATCH /transactions/:id` /
      `DELETE /transactions/:id` to work for either destination
- [x] 3.9 Update `toTransactionResponse` to include `status` (null for wallet-
      destination rows)
- [x] 3.10 Test: logging a charge increases the card's balance by the amount
      (spec: "Logging a charge succeeds")
- [x] 3.11 Test: logging a charge without `status` defaults to `posted`; explicit
      `pending` persists and still moves the balance the same as `posted`
- [x] 3.12 Test: logging a charge against another user's card 404s, no charge
      created, no balance changes
- [x] 3.13 Test: logging a charge with an `income`-type category is rejected
- [x] 3.14 Test: logging a charge with a non-positive amount is rejected
- [x] 3.15 Test: editing a charge's amount adjusts the card's balance correctly
      (old delta reversed, new delta applied)
- [x] 3.16 Test: moving a charge to a different owned card moves its balance effect;
      moving to another user's card 404s and neither balance changes
- [x] 3.17 Test: deleting a charge reverses its balance effect
- [x] 3.18 Test: the all-wallets `GET /transactions` list never includes card
      charges, even when filters are applied (spec: "Credit card charges never
      appear in the all-wallets list") — regression guard for design.md Decision 4

## 4. `credit-cards` module (web) — card CRUD

- [x] 4.1 `apps/web/src/modules/credit-cards/api.ts`: Hono RPC client calls for
      card CRUD + charge endpoints
- [x] 4.2 `modules/credit-cards/lib/credit-card-icons.ts` (reuses/mirrors
      `wallet-icons.ts`)
- [x] 4.3 `modules/credit-cards/schemas/credit-card-form.schema.ts` (view-only form
      schema, mirrors `wallet-form.schema.ts`)
- [x] 4.4 Hooks: `use-credit-cards-query.ts`, `use-create-credit-card-mutation.ts`,
      `use-update-credit-card-mutation.ts`, `use-delete-credit-card-mutation.ts`
      (mirror the wallets hooks)
- [x] 4.5 Components: `credit-card-appearance-picker.tsx` (or reuse
      `wallet-appearance-picker.tsx` if it's already appearance-agnostic),
      `create-credit-card-dialog.tsx`, `edit-credit-card-dialog.tsx`,
      `delete-credit-card-dialog.tsx`, `credit-card-card.tsx` (list item),
      `credit-card-list.tsx`, `credit-card-empty-state.tsx`,
      `credit-card-total-balance.tsx`
- [x] 4.6 `modules/credit-cards/credit-cards-page.tsx` and
      `credit-card-detail-page.tsx`
- [x] 4.7 `app/(private)/credit-cards/page.tsx` and
      `app/(private)/credit-cards/[id]/page.tsx` (thin route files importing from
      the module, per frontend.md's routing-vs-logic split)
- [x] 4.8 Add "Credit Cards" entry to `nav-items.ts` (single source for sidebar +
      header title — see existing project convention)

## 5. `credit-cards` module (web) — charge logging + quick-add

- [x] 5.1 `hooks/use-card-charges-query.ts`, `use-create-card-charge-mutation.ts`,
      `use-update-card-charge-mutation.ts`, `use-delete-card-charge-mutation.ts`
- [x] 5.2 `components/charge-list-item.tsx`, `charge-list.tsx` (rendered on
      `/credit-cards/[id]`), reusing the existing `category-picker.tsx` from
      `modules/transactions`
- [x] 5.3 `components/quick-add-charge-sheet.tsx` and
      `quick-add-charge-provider.tsx`, mirroring
      `quick-add-transaction-provider.tsx`: path-matches `/credit-cards/[id]` to
      pre-fill `defaultCardId`, registers the `c` keyboard shortcut (design.md
      Decision 6 — confirm no collision in `use-keyboard-shortcut`'s existing usage
      before wiring it in)
- [x] 5.4 Mount `QuickAddChargeProvider` alongside `QuickAddTransactionProvider` in
      `app/(private)/layout.tsx`
- [x] 5.5 Add a visible "Log charge" quick-action affordance on
      `/credit-cards/[id]` (per the product doc's speed principle — this is the
      low-friction screen interaction paired with the shortcut)
- [x] 5.6 `edit-charge-sheet.tsx`, `delete-charge-dialog.tsx` for the charge list
- [x] 5.7 Empty state on `/credit-cards/[id]` with a way to log the first charge

## 6. Final checks

- [x] 6.1 `bun run lint && bun test && bun run build` passes across the monorepo
- [x] 6.2 Manually walk the flows in a browser: create a card, log a charge via
      both the dialog/detail page button and the `c` shortcut, edit/delete a
      charge, delete a card and confirm its charges are gone, confirm
      `/transactions` never shows a card charge
