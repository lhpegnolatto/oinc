## 1. Shared schema & validation

- [x] 1.1 Add `category` table to `shared/db/schema/categories-schema.ts`: `id` (text pk),
      `userId` (text, nullable FK → `user.id`, cascade delete), `name` (text), `type`
      (pg enum `income`/`expense`), `color` (text), `icon` (text), `createdAt`,
      `updatedAt`. Index `userId`.
- [x] 1.2 Add `transaction` table to `shared/db/schema/transactions-schema.ts`: `id` (text
      pk), `walletId` (text FK → `wallet.id`, cascade delete), `categoryId` (text FK →
      `category.id`, restrict delete), `userId` (text FK → `user.id`, cascade delete),
      `type` (pg enum `income`/`expense`), `amount` (`numeric(14,2)`), `date` (date),
      `note` (text, nullable), `createdAt`, `updatedAt`. Indexes: `walletId`,
      `categoryId`, `userId`, composite `(walletId, date)`.
- [x] 1.3 Export both new schema files from `shared/db/schema/index.ts`.
- [x] 1.4 Run `drizzle-kit generate` to produce the migration for both tables.
- [x] 1.5 Append a hand-written idempotent SQL seed (`ON CONFLICT DO NOTHING`) to the
      generated migration inserting the fixed system categories with stable ids (e.g.
      `system-food`, `system-salary`) — finalize the exact name/type/color/icon list.
- [x] 1.6 Extract `shared/validation/appearance.ts` from `wallet-appearance.ts`: hex-color
      regex, `colorSchema` factory, and the swatch preset list — domain-agnostic, kept
      separate from the icon key enums.
- [x] 1.7 Update `wallet-appearance.ts` to consume the extracted color schema; confirm
      `walletIconSchema`/`WALLET_ICON_KEYS`/`DEFAULT_WALLET_ICON` are unchanged (no
      behavior change for wallets).
- [x] 1.8 Add `shared/validation/category-appearance.ts`: curated `CATEGORY_ICON_KEYS`
      enum, `categoryIconSchema`, `DEFAULT_CATEGORY_ICON`, reusing the shared color
      schema from 1.6.
- [x] 1.9 Add `./category-appearance` (and if not already present, `./appearance`) to
      `apps/api`'s `package.json` `exports`, mirroring the existing `./wallet-appearance`
      subpath.
- [x] 1.10 Add a `ConflictError` (409) class to `shared/errors/api-error.ts` and export it
      from `shared/errors/index.ts`, for the category-in-use case.

## 2. API: transaction-categories module

- [x] 2.1 Scaffold `modules/categories/{controllers,commands,queries,repositories,domain,schemas}`.
- [x] 2.2 Domain: `Category` entity, `CategoryNotFoundError`, `CategoryInUseError`.
- [x] 2.3 Repository (`CategoriesRepository`): `findAllVisibleToUser(userId)` (system +
      own custom), `findOwnedById(id, userId)`, `create`, `update`, `delete`, and a
      `countTransactionsUsingCategory(id)` helper (or equivalent query against the
      `transaction` table) for the in-use check.
- [x] 2.4 Command `createCategory`: validates type/color/icon, persists with
      `crypto.randomUUID()`, owned by the requesting user.
- [x] 2.5 Command `updateCategory`: name/color/icon only (type immutable), scoped to
      categories owned by the requesting user; throws `CategoryNotFoundError` for a
      missing/system/other-user category.
- [x] 2.6 Command `deleteCategory`: scoped to owned custom categories; throws
      `CategoryInUseError` if any transaction still references it, `CategoryNotFoundError`
      otherwise.
- [x] 2.7 Query `listCategories`: system categories + the requesting user's own.
- [x] 2.8 Schemas: `createCategorySchema`, `updateCategorySchema`,
      `categoryIdParamSchema`, `toCategoryResponse`.
- [x] 2.9 Controllers: `POST /categories`, `GET /categories`, `PATCH /categories/:id`,
      `DELETE /categories/:id`, all behind `requireAuth`, mapping domain errors to the
      shared error contract (404 for not-found, 409 for in-use).
- [x] 2.10 Register `categoriesRouter` in `app/routes.ts`.
- [x] 2.11 Test: system categories visible to every user and immutable (spec scenarios
      under "Every signed-in user has access to a fixed set of system categories").
- [x] 2.12 Test: create/update/delete a custom category, including validation failures
      (empty name, invalid color/icon) and ownership checks (404 on another user's
      category).
- [x] 2.13 Test: deleting a custom category in use returns a conflict and leaves it
      intact; deleting an unused one succeeds.

## 3. API: transactions module

- [x] 3.1 Scaffold `modules/transactions/{controllers,commands,queries,repositories,domain,schemas}`.
- [x] 3.2 Domain: `Transaction` entity, `TransactionNotFoundError`.
- [x] 3.3 Repository (`TransactionsRepository`): CRUD scoped by `userId`, plus the
      wallet-balance mutation helper described in design.md — imports the shared `wallet`
      table directly (not the `wallets` module's repository/commands/domain) and runs
      `SELECT ... FOR UPDATE` + `UPDATE wallet SET balance = ...` inside the same
      `db.transaction()` as the transaction row write.
- [x] 3.4 Command `createTransaction`: locks and validates the target wallet is owned by
      the user, validates category type matches transaction type (via categories
      repository/query composed at the command level — read-only cross-module access is
      fine per backend.md), inserts the row, applies the signed delta to `balance`.
- [x] 3.5 Command `updateTransaction`: locks the current wallet and (if `walletId`
      changes) the target wallet, both in id-sorted order to avoid deadlocks; reverses the
      old delta, applies the new delta, updates the row; re-validates category/type match
      if either changed.
- [x] 3.6 Command `deleteTransaction`: locks the wallet, reverses the delta, deletes the
      row.
- [x] 3.7 Query `listTransactionsForWallet`: verifies the wallet is owned by the requesting
      user (404 otherwise), returns transactions ordered by `date` desc, `createdAt` desc.
- [x] 3.8 Schemas: `createTransactionSchema`, `updateTransactionSchema`,
      `transactionIdParamSchema`, `toTransactionResponse`.
- [x] 3.9 Controllers: `POST /wallets/:walletId/transactions`,
      `GET /wallets/:walletId/transactions`, `PATCH /transactions/:id`,
      `DELETE /transactions/:id`, behind `requireAuth`.
- [x] 3.10 Register the transactions router(s) in `app/routes.ts`.
- [x] 3.11 Test: creating an income/expense transaction updates wallet balance correctly;
      creating against another user's wallet 404s; mismatched category type and
      non-positive amount are rejected.
- [x] 3.12 Test: listing a wallet's transactions is scoped and ordered correctly; another
      user's wallet 404s.
- [x] 3.13 Test: editing amount adjusts balance by the difference; moving a transaction
      between two owned wallets moves its balance effect; editing another user's
      transaction, or moving to an unowned wallet, 404s.
- [x] 3.14 Test: deleting a transaction reverses its balance effect; deleting another
      user's transaction 404s.
- [x] 3.15 Test: two concurrent edits against the same wallet don't corrupt its balance
      (integration-level test exercising the row lock).

## 4. API: wallets cascade + balance-immutability regression coverage

- [x] 4.1 Update `wallet` schema/relations if needed so `transaction.walletId`'s
      `onDelete: "cascade"` is reflected (schema-level change lives in 1.2, this task is
      about wiring/relations only).
- [x] 4.2 Test: deleting a wallet also deletes its transactions (wallets delta spec
      scenario).
- [x] 4.3 Test: updating a wallet's name/color/icon never changes its balance, even after
      transactions exist (wallets delta spec scenario).

## 5. Web: shared promotions & shortcut infra

- [x] 5.1 Move `format-currency.ts` from `modules/wallets/lib/` to `apps/web/src/lib/`;
      update wallets' imports.
- [x] 5.2 Move the color preset list from `modules/wallets/lib/wallet-color-presets.ts` to
      a shared `apps/web/src/lib/color-presets.ts`; update wallets' imports.
- [x] 5.3 Add `apps/web/src/hooks/use-keyboard-shortcut.ts`: generic single-key listener
      that ignores keydown when focus is on an editable element or a modifier key is
      held.
- [x] 5.4 Wire the shortcut in `app/(private)/layout.tsx` (or a small client component it
      renders) bound to `n`, opening the quick-add transaction sheet.
- [x] 5.5 Test: shortcut hook ignores keystrokes while an input/textarea is focused
      (spec scenario "Shortcut is ignored while typing").

## 6. Web: transaction-categories module

- [x] 6.1 Scaffold `modules/transactions/{components,hooks,schemas,lib,api.ts}` (category
      pieces live alongside transactions per the roadmap's module nesting).
- [x] 6.2 `lib/category-icons.ts` mirroring `wallet-icons.ts`, keyed by
      `CATEGORY_ICON_KEYS` from `@oinc/api/category-appearance`.
- [x] 6.3 `hooks/use-categories-query.ts`, `use-create-category-mutation.ts` via the Hono
      RPC client.
- [x] 6.4 Category picker component used inside the quick-add sheet: filtered by the
      selected transaction type, with an inline "new category" affordance (small
      dialog/popover reusing the appearance-picker pattern) so creating a custom category
      doesn't require leaving the transaction flow.

## 7. Web: transactions module

- [x] 7.1 `schemas/transaction-form.schema.ts` (view-only form shape; API types come from
      `AppType`).
- [x] 7.2 `hooks/use-wallet-transactions-query.ts`,
      `use-create-transaction-mutation.ts`, `use-update-transaction-mutation.ts`,
      `use-delete-transaction-mutation.ts`, invalidating both the transaction list and the
      wallet query (balance changed) on success.
- [x] 7.3 `components/quick-add-transaction-sheet.tsx`: type toggle (income/expense),
      amount, category picker (from 6.4), wallet field (pre-filled + changeable when
      opened from `/wallets/[id]`, empty + required otherwise), date, optional note.
- [x] 7.4 `components/transaction-list.tsx` and `components/transaction-list-item.tsx`.
- [x] 7.5 `components/edit-transaction-sheet.tsx` and a delete-confirmation flow
      (reusing the wallets module's confirmation-dialog pattern).
- [x] 7.6 Quick-add trigger button placed in the private layout/header (visible
      quick-action affordance, not just the shortcut).

## 8. Web: `/wallets/[id]` page

- [x] 8.1 `app/(private)/wallets/[id]/page.tsx`: fetch the wallet (404 → Next.js
      `notFound()`), render its header (reusing wallet appearance/balance display) and
      `TransactionList`, plus a wallet-scoped "Add transaction" entry point.
- [x] 8.2 Add an empty state for a wallet with no transactions yet, with a way to log the
      first one.
- [x] 8.3 Link wallet cards on `/wallets` to `/wallets/[id]`.
- [x] 8.4 Test: navigating from a wallet card reaches `/wallets/[id]` and shows its
      transactions; empty state renders for a wallet with none.

## 9. Verification

- [x] 9.1 `bun run lint && bun test && bun run build` clean across the monorepo.
- [x] 9.2 Manually exercise the quick-add shortcut and sheet from both `/wallets/[id]`
      and a screen with no wallet context, confirming the pre-fill/require-selection
      behavior from design.md.
