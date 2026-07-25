## Why

Transactions are currently only visible scoped to one wallet at a time
(`/wallets/[id]`), so there's no way to review money across every wallet at
once — including catching a transaction accidentally logged against the wrong
wallet. Separately, `transactions-core` shipped a full category-management API
(`apps/api/src/modules/categories`: create/update/delete/list) but `apps/web`
only ever exposed category *creation*, inline inside the quick-add sheet —
there's no way to edit or delete a category today.

## What Changes

- New `apps/web` route `/transactions`: an all-wallets, filterable transaction
  list. This is a review/vision surface, not a quick-add surface — it
  deliberately does not follow the sheet + keyboard-shortcut pattern, since
  reviewing transactions is a low-frequency action, unlike logging one.
- Filters — wallet, category, type (`income`/`expense`), date range, and a
  free-text search over the transaction's `note` — synced to URL query state,
  so a filtered view is shareable/bookmarkable/back-button-safe. This is the
  first screen in `apps/web` needing URL-driven filter state.
- Each row in the `/transactions` list displays which wallet it belongs to
  (previously implicit, since the only existing list was already scoped to
  one wallet), directly serving the "did I log this on the wrong wallet"
  review case.
- New `apps/web` route `/transactions/categories`: view every available
  category (system + the signed-in user's own custom ones) and edit or delete
  a custom category. System categories render read-only (no edit/delete
  affordance), matching the existing API rule that they can't be mutated.
  Deleting a custom category still referenced by a transaction surfaces the
  existing `CategoryInUseError` as an inline message — no cascade or
  reassignment UX.
- Sidebar navigation restructured from a flat list to a shallow tree:
  `nav-items.ts` and `nav-main.tsx` grow to support one level of nested
  items, and "Transactions" becomes a top-level entry with "Categories" as
  its sub-item, using the sidebar's already-available but currently unused
  `SidebarMenuSub`/`SidebarMenuSubButton` primitives.
- New `apps/api` query: listing a user's transactions across all of their
  wallets, with the same filters the `/transactions` page exposes
  (wallet/category/type/date-range/note search). The existing
  `list-transactions-for-wallet` query stays as-is for `/wallets/[id]`.

## Capabilities

### New Capabilities
_(none — both pieces extend existing capabilities below)_

### Modified Capabilities
- `transactions`: adds an all-wallets, filterable list (`apps/web`
  `/transactions`) and its backing `apps/api` query, alongside the existing
  per-wallet list on `/wallets/[id]`.
- `transaction-categories`: adds an `apps/web` surface
  (`/transactions/categories`) for viewing, editing, and deleting categories —
  the `apps/api` update/delete requirements already exist and are unchanged;
  only the missing web UI is new.

## Impact

- `apps/web`: new `app/(private)/transactions/page.tsx` and
  `app/(private)/transactions/categories/page.tsx`; `modules/transactions/`
  grows with an all-wallets list query/hook, filter components, and a
  URL-state helper (new pattern for this repo — approach decided in
  `design.md`); category edit/delete components added alongside the existing
  `NewCategoryDialog`/`CategoryAppearancePicker`; `components/nav-items.ts`
  changes shape from a flat array to a shallow tree, `components/nav-main.tsx`
  updated to render the nested item.
- `apps/api`: `modules/transactions/queries` gains a
  list-across-wallets-for-user query with filter params; no schema/migration
  changes. `modules/categories` is reused as-is (its controller already
  exposes `PATCH`/`DELETE /categories/:id`).
- No breaking changes; no changes to `packages/env`, auth, or other modules.
