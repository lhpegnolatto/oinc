## Why

Credit cards are one of the four core product pillars (see `.docs/product/overview.md`)
but don't exist in the app yet — every dollar spent on credit is currently invisible to
oinc. This is roadmap item 4, the first change to introduce a domain that behaves
differently from a wallet (statement cycles, due dates, pending vs. posted amounts), and
it's a prerequisite for `credit-card-statements` (roadmap item 5), which builds the actual
statement-cycle and card-payment behavior on top of the fields this change stores.

## What Changes

- Add a `credit-cards` module (api + web): a credit card is its own entity with a name,
  a color/icon appearance (same treatment as a wallet's — reuses the curated icon set),
  a `statementCloseDay` and `dueDay` (day-of-month integers, stored and displayed, inert
  until `credit-card-statements` gives them cycle behavior). No credit limit field in this
  change.
- **BREAKING** (schema, not API-compatibility-breaking): the `transaction` table's
  `walletId` becomes nullable and gains a nullable `cardId` (FK to the new
  `credit_card` table) and a nullable `status` (`pending`/`posted`, meaningful only when
  `cardId` is set) — a transaction now belongs to exactly one of a wallet or a card,
  enforced by a DB check constraint.
- Generalize the `transactions` module's create/update/delete commands and repository to
  accept a card destination alongside a wallet destination, mirroring the existing
  wallet-balance side effect: a card's `balance` (amount owed) is updated atomically in
  the same DB transaction as the charge write, using the same lock-then-update pattern
  already used for wallets. Both pending and posted charges count toward a card's
  balance — the pending/posted split only matters for statement-cycle math, which this
  change does not implement.
- `apps/web`: new `/credit-cards` (list + create) and `/credit-cards/[id]` (detail +
  charge list) pages, a sidebar nav entry, and a dedicated quick-add sheet + keyboard
  shortcut for logging a card charge (distinct from the existing transaction shortcut,
  per the product doc's "fast is a feature" principle — logging a card charge is named
  there as exactly this kind of frequent action).
- Explicitly out of scope (deferred to `credit-card-statements`): statement close/due-date
  *behavior* (cycle rollover, computing which charges belong to which statement), paying
  a card from a wallet, and any reminder/notification tied to the due date. Also out of
  scope: card charges appearing in the unified `/transactions` list or feeding dashboard
  net worth (later roadmap items).

## Capabilities

### New Capabilities
- `credit-cards`: credit card CRUD (create/list/update/delete), appearance, statement
  field storage, and the card detail page.

### Modified Capabilities
- `transactions`: a transaction's destination generalizes from "a wallet the user owns"
  to "a wallet or credit card the user owns," adding the pending/posted `status` field
  and the card-balance side effect alongside the existing wallet-balance one.

## Impact

- `apps/api`: new `modules/credit-cards/` (controllers, commands, queries, repositories,
  domain, schemas); `shared/db/schema/` gains `credit-cards-schema.ts` and a migration
  altering `transactions-schema.ts` (nullable `walletId`, new `cardId`/`status`, check
  constraint); `modules/transactions/` commands + `TransactionsRepository` generalized to
  a wallet-or-card destination.
- `apps/web`: new `modules/credit-cards/` (components, hooks, schemas, lib), new
  `app/(private)/credit-cards/` and `app/(private)/credit-cards/[id]/` routes, sidebar
  nav entry (`nav-items.ts`), a new keyboard shortcut registration alongside the existing
  transaction one.
