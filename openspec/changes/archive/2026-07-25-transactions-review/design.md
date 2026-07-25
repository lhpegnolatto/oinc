## Context

Two gaps exist today, both purely on the surfacing/review side of already-shipped
data:

- Transactions are only ever listed scoped to one wallet
  (`list-transactions-for-wallet`, rendered on `/wallets/[id]`). There is no
  query or page that shows a signed-in user's transactions across every wallet
  they own.
- `apps/api`'s `modules/categories` already ships full CRUD (`create`, `update`,
  `delete`, `list`) with `CategoryInUseError` guarding deletion of an in-use
  category. `apps/web` only ever calls the create endpoint
  (`NewCategoryDialog`, inline in the quick-add sheet's category picker) — no
  UI exists to view, edit, or delete a category.

Other constraints this design works within: `apps/web`'s sidebar
(`nav-items.ts` / `nav-main.tsx`) is currently a flat list — the underlying
shadcn sidebar primitive already ships `SidebarMenuSub`/`SidebarMenuSubButton`
(`components/ui/sidebar.tsx`), just unused. No URL-query-state library or
pattern exists anywhere in `apps/web` yet — this is the first screen that
needs one. `transaction` already carries indexes on `walletId`, `categoryId`,
`userId`, and the composite `(walletId, date)`, but not `(userId, date)`.

## Goals / Non-Goals

**Goals:**
- A signed-in user can see and filter their transactions across all wallets,
  from one page, with filters reflected in the URL (shareable, bookmarkable,
  back-button-safe).
- A signed-in user can view, edit, and delete their own custom categories from
  a dedicated page; system categories render read-only.
- Sidebar navigation gains exactly one level of nesting, generalized enough
  that a future nav item can reuse it without redesigning the type.

**Non-Goals:**
- No bulk actions (multi-select recategorize/delete) — a distinct, larger ask
  not requested here.
- No CSV/bank import of transactions.
- No full-text or fuzzy search infrastructure — note search is a plain
  case-insensitive substring match.
- No cascade or reassignment UX when deleting an in-use category — unchanged
  from `transactions-core`; the user recategorizes first.
- No change to the quick-add sheet, its shortcut, or per-wallet list on
  `/wallets/[id]` — both are additive alongside this change.
- No pagination on the all-wallets list in this slice (see Risks).

## Decisions

### 1. New `apps/api` query: list a user's transactions across all wallets

`modules/transactions/queries/list-transactions-for-user.ts`, scoped directly
by `userId` (not by iterating each wallet), accepting optional filters:
`walletId`, `categoryId`, `type`, `dateFrom`/`dateTo`, and `noteSearch`. It
joins `wallet` to return each row's wallet name/color/icon alongside the
transaction, so `apps/web` never has to N+1 wallet lookups per row — queries
are explicitly allowed to shape a screen-specific projection and bypass the
domain model per `backend.md`'s CQRS boundary.

Rejected alternative: call the existing `list-transactions-for-wallet` once
per wallet and merge client-side. Rejected because cross-wallet date sorting
would require re-sorting in application code anyway, it's N queries instead of
one, and it duplicates ownership-scoping logic instead of expressing "all of
this user's transactions" as what it actually is — one query.

A filter referencing a wallet/category the user doesn't own (or that doesn't
exist) simply yields zero matching rows — unlike the single-wallet
create/update/delete paths, an unmatched filter isn't a `NotFoundError`
condition, it's just an empty result set, same as any other filter that
matches nothing.

### 2. New index: `transaction_userId_date_idx` on `(userId, date)`

The new query sorts by `date` descending scoped by `userId`, mirroring why
`transaction_walletId_date_idx` already exists for the per-wallet list — per
`backend.md`'s rule that every filtered/sorted column needs a matching index.
`note` search (ILIKE) gets no dedicated index; see Risks.

### 3. URL filter state: adopt `nuqs`

Confirmed via Context7 (`/47ng/nuqs`, high source reputation) that its Next.js
App Router adapter supports App Router from v14.2.0 — this repo is on
Next.js 16.2.6, well within range. `/transactions` wraps its filters in
`useQueryStates` (client component) for `wallet`, `category`, `type`,
`dateFrom`/`dateTo`, and `q` (note search), giving type-safe parse/serialize
and shallow routing (no full navigation on filter change) for free.
`NuqsAdapter` is mounted at `app/(private)/layout.tsx` — scoped to the private
app rather than the root layout, since filters are only needed there and
`(public)` routes have no current or anticipated need for query-state.

**Deviation from `frontend.md`**: this adds `nuqs` as a new workspace
dependency in `apps/web`. Rejected alternative: hand-roll filter sync via
`useSearchParams` + `router.replace`. Rejected because it re-implements
parsing/serialization/shallow-routing that `nuqs` already solves, and this
repo already reaches for well-maintained libraries over hand-rolled
infrastructure elsewhere (React Hook Form, TanStack Query) — a hand-rolled
version would be the odd one out, not the simpler choice.

### 4. Category management UI stays inside the `transactions` web module

`apps/web` gets no `modules/categories/` — the new page
(`/transactions/categories`) and its components (edit/delete dialogs) are
added to the existing `modules/transactions/components/`, alongside
`CategoryAppearancePicker` and `NewCategoryDialog`, which already live there.

**Note on asymmetry with `apps/api`**: `apps/api` has categories as their own
top-level module (`modules/categories`, separate from `modules/transactions`)
— a pre-existing drift from `transactions-core`'s `design.md`, which had
originally called for nesting categories inside the `transactions` module on
the API side too. This change does not attempt to re-nest the API module; it
targets the existing `modules/categories` controller as-is (its
`PATCH`/`DELETE /categories/:id` routes already exist and need no changes).
On the web side, categories have exactly one consumer — the `transactions`
module — so per `frontend.md`'s "a module owns a vertical slice" there's no
case for a second module there. This asymmetry (API: separate module, web:
nested) is intentional, not an inconsistency to "fix."

### 5. Sidebar: one level of nesting, not a generic tree

`NavItem` (`nav-items.ts`) gains an optional `items?: NavItem[]`. `nav-main.tsx`
renders any item with `items` using `SidebarMenuSub`/`SidebarMenuSubButton`
around its children; items without `items` render exactly as they do today.
"Transactions" becomes a top-level entry with "Categories" as its one child.

Rejected alternative: a boolean/parent-id flag per item. An `items` array
composes directly with the existing `SidebarMenuSub` primitive and needs no
lookup/grouping step to render; it also generalizes cleanly if a later nav
item needs the same one-level nesting, without inviting deeper recursion (the
type stays shallow on purpose — `items` is not itself recursive).

### 6. Wallet indicator on each row

`/transactions` rows show a small badge using the row's wallet color/icon —
the same appearance treatment wallet cards already use, no new visual
language. This directly serves the "did I log this on the wrong wallet"
review case named as the motivating use case.

## Risks / Trade-offs

- **No pagination on the all-wallets list** → likely to get long faster than
  the already-accepted no-pagination per-wallet list, since it aggregates
  every wallet's history. Accepted for this slice at current single-user
  scale, same posture as `transactions-core`; revisit if it becomes real pain
  rather than pre-building infinite-scroll/pagination speculatively.
- **`note` search has no supporting index** (`ILIKE '%term%'` can't use a
  plain btree index for a leading wildcard) → acceptable at this scale;
  revisit with a `pg_trgm` GIN index if search latency becomes noticeable.
- **New dependency (`nuqs`)** → one more package to track; mitigated by its
  narrow surface area and high reputation/adoption, and it replaces what
  would otherwise be hand-rolled equivalent code, not net-new complexity.
- **Sidebar nesting precedent** → capping at one level now avoids designing a
  speculative deep-tree nav system; if a second nested item is needed later
  this shape already supports it without a rewrite.

## Migration Plan

Additive only: one new Drizzle index migration
(`transaction_userId_date_idx`) via `drizzle-kit generate`, no column/table
changes. New `apps/web` route segments and one new dependency (`nuqs`) —
nothing to roll back beyond reverting the change; no data migration involved.

## Open Questions

- Exact date-range filter UX — presets ("This month", "Last 30 days") plus a
  custom range, or raw from/to inputs only. Leaving as a `tasks.md`/UI-taste
  detail, not architectural.
- Whether `note` search should also match against the transaction's category
  name — starting note-only; revisit if that proves too narrow once there's
  real usage.
