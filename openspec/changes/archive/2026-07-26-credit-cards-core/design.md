## Context

Today `transaction.walletId` is `NOT NULL` and every transaction moves a wallet's
`balance` via `TransactionsRepository`'s `createWithBalanceUpdate` /
`updateWithBalanceUpdate` / `deleteWithBalanceUpdate` — each locks the wallet row
`FOR UPDATE` inside a DB transaction, then applies a signed delta computed by
`balanceDelta(type, amount)` (`income` → `+amount`, `expense` → `-amount`). That
repository already reaches directly into the shared `wallet` table (not the wallets
module's own repository/commands) for this bookkeeping — an explicit precedent
(`isWalletOwnedByUser`'s comment: "never routes through the wallets module's own
repository/commands") for exactly the kind of shared-table access this change needs
to extend to `credit_card`.

Card charges need the same three properties a wallet transaction has (amount,
category, atomic balance side-effect) plus one a wallet transaction doesn't:
pending/posted status. Reusing the existing `transaction` table — generalized to a
wallet-or-card destination — avoids standing up a second ledger table with its own
category-validation, listing, and edit/delete logic that would duplicate everything
`transactions` already does.

## Goals / Non-Goals

**Goals:**
- A signed-in user can create/list/update/delete a credit card (name, appearance,
  `statementCloseDay`, `dueDay`) they own.
- A signed-in user can log a charge against a card they own, with the same shape as a
  wallet transaction (amount, category, date, note, always type `expense`) plus a
  `pending`/`posted` status, and the card's `balance` (amount owed) updates
  atomically.
- Logging a card charge has its own keyboard shortcut and quick-add sheet, reachable
  from anywhere in the private app, per the product doc's speed principle.
- The `transaction` table's destination generalizes cleanly enough that
  `credit-card-statements` can later add cycle/payment behavior without another
  schema migration to the core shape.

**Non-Goals:**
- Statement cycle computation (which charges belong to which statement, cycle
  rollover) — `credit-card-statements`.
- Paying a card from a wallet — `credit-card-statements`.
- Converting an existing transaction between a wallet destination and a card
  destination via edit (only wallet→wallet and card→card moves are supported,
  mirroring what "editing a transaction" already does today). Not a real user story
  yet, and it doubles the combinations the update-with-balance-update path has to
  reason about for no current benefit.
- A credit limit / available-credit field.
- `income`-type card charges (refunds/credits) — every charge logged against a card
  in this change is an `expense`; see Decision 3.
- Card charges appearing in the unified `/transactions` list or feeding dashboard net
  worth.
- Any cross-field validation between `statementCloseDay` and `dueDay` (e.g. due day
  must fall after close day) — meaningless until cycle math exists.

## Decisions

### 1. One `transaction` table, generalized destination — not a separate `card_charge` entity

`transaction.walletId` becomes nullable; a nullable `cardId` (FK → `credit_card`,
`onDelete: cascade`) and nullable `status` (`pending` | `posted`, only ever set when
`cardId` is set) are added, with a DB check constraint enforcing exactly one of
`walletId` / `cardId`:

```ts
// shared/db/schema/transactions-schema.ts
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "posted",
]);

export const transaction = pgTable(
  "transaction",
  {
    // ...existing columns
    walletId: text("wallet_id").references(() => wallet.id, { onDelete: "cascade" }), // now nullable
    cardId: text("card_id").references(() => creditCard.id, { onDelete: "cascade" }),
    status: transactionStatusEnum("status"),
  },
  (table) => [
    // ...existing indexes
    index("transaction_cardId_idx").on(table.cardId),
    index("transaction_cardId_date_idx").on(table.cardId, table.date),
    check(
      "transaction_exactly_one_destination",
      sql`(${table.walletId} IS NOT NULL) <> (${table.cardId} IS NOT NULL)`,
    ),
  ],
);
```

**Alternative considered**: a separate `card_charge` table inside the `credit-cards`
module, structurally similar to `transaction`. Rejected — it would duplicate category
validation, ownership checks, and CRUD wiring that `transactions` already has, split
"money movement" across two mental models the user never sees as different (the
product doc treats "logging a card charge" as a peer of "logging a transaction," not a
different concept), and cost a second full migration once `credit-card-statements`
needs charges to interact with statements.

### 2. `transactions` module keeps owning all writes to `transaction`; `credit-cards` module owns only the card entity

`TransactionsRepository`, `createTransaction`/`updateTransaction`/`deleteTransaction`,
and `transactionsRouter` generalize to accept a card destination alongside a wallet
one — the same module, same files, extended in place. The `credit-cards` module gets
its own `CreditCardsRepository`/commands/queries for the `credit_card` entity's own
CRUD, but never writes a `transaction` row itself.

Routing mirrors the existing wallet shape exactly:

```
walletsRouter        /wallets                        (card-entity CRUD equivalent)
creditCardsRouter     /credit-cards                   (new — card entity CRUD)
transactionsRouter    /wallets/:walletId/transactions  (existing)
                       /credit-cards/:cardId/charges    (new — same router, same repo)
                       /transactions/:id (PATCH/DELETE)  (existing, generalized)
                       /transactions (GET, all-wallets)  (existing, unchanged —
                                                           see Decision 4)
```

**Alternative considered**: `credit-cards` controller orchestrates by calling
`transactions`' commands directly (allowed per `backend.md`'s controller-layer
exception to module independence). Rejected in favor of keeping the route in
`transactionsRouter` itself — that file already owns two different path shapes for
the same reason ("this module owns two distinct path shapes: wallet-scoped
create/list, and flat transaction-id-scoped update/delete"); a third path shape for
the same underlying table is the same pattern, not a new one, and avoids a
cross-module controller import for something as central as "write a transaction row."

### 3. Card charges are `expense`-only; the balance delta is a flat add, not a reuse of `balanceDelta`

A wallet's `balance` is "money you have": `expense` subtracts, `income` adds. A
card's `balance` is "money you owe," and the only thing this change logs against a
card is a charge — there's no payment/refund/credit modeling here (that's
`credit-card-statements`' job, alongside paying a card from a wallet). So rather than
supporting `income`-type card charges and inverting `balanceDelta` for them (extra
branching for a case with no real scenario yet — a "refund" would need its own
category semantics that don't exist), the `type` on a card-destination transaction is
constrained to `expense` at the schema/validation layer, and the balance effect is
unconditional:

```ts
function cardBalanceDelta(amount: number) {
  return amount; // every card charge increases what's owed; no income-type charges in this change
}
```

This is simpler than mirroring `balanceDelta`'s income/expense branch, and it avoids
inventing "what does an income-type card transaction mean" before there's a concrete
requirement for one. If `credit-card-statements` (or a later change) needs to model a
refund, that's a new decision made with that change's actual use case in hand, not
speculative work here.

### 4. Card charges are excluded from `/transactions` (all-wallets list) for free

`listTransactionsForUser`'s query does an `innerJoin(wallet, ...)` — a
card-destination row (`walletId IS NULL`) simply produces no join match and is
already excluded without any filter change. Calling this out explicitly so it isn't
mistaken for a gap later: this is the mechanism, not an oversight, and it's exactly
why Decision 1's nullable-`walletId` approach doesn't need a companion "exclude cards"
flag anywhere in that query.

### 5. Card appearance reuses the domain-agnostic color schema, adds its own icon vocabulary

`shared/validation/appearance.ts` (`colorSchema`, `DEFAULT_COLOR`) is already
domain-agnostic — wallet and category each layer their own curated icon list on top
of it. `credit-cards` does the same (`shared/validation/credit-card-appearance.ts`),
reusing wallet's existing curated Lucide icon set rather than curating a second one,
since there's no card-network-logo requirement in scope and the two domains render
the same way (icon-in-a-tinted-circle).

### 6. Card charge has its own shortcut + sheet, mirroring `QuickAddTransactionProvider`

A new `QuickAddCardChargeProvider` (mounted alongside the existing
`QuickAddTransactionProvider` in `app/(private)/layout.tsx`) owns a second keyboard
shortcut and its own sheet, following the exact pattern already in
`quick-add-transaction-provider.tsx`: path-matches `/credit-cards/[id]` to pre-fill
`defaultCardId`, otherwise opens with the card field empty. Shortcut key: **`c`**
(unused today — `n` is taken by transactions).

## Risks / Trade-offs

- **[Risk]** The check constraint (`exactly one of walletId/cardId`) is new to this
  codebase — no existing table enforces an either/or FK shape. → **Mitigation**:
  Drizzle's `check()` builder supports this directly; add a repository-level test
  that inserting a row with both or neither set fails at the DB layer, not just in
  Zod validation, so the invariant holds even if a future write path bypasses the
  command layer.
- **[Risk]** Generalizing `updateWithBalanceUpdate` to lock-and-update whichever table
  applies (wallet or card) roughly doubles the branching in an already
  concurrency-sensitive method (see its existing comments on lock ordering to avoid
  deadlocks). → **Mitigation**: keep wallet→wallet and card→card as the only two
  "move" shapes (Non-Goal above) rather than also supporting wallet↔card conversion,
  which would otherwise force a third and fourth branch.
- **[Trade-off]** `status` is a column on `transaction` that's meaningless for every
  wallet-destination row (always `NULL`). Accepted because the alternative (a
  parallel table) duplicates far more than one nullable column costs, per Decision 1.

## Migration Plan

1. Add `credit_card` table (`shared/db/schema/credit-cards-schema.ts`): `id`,
   `userId` (FK, cascade), `name`, `balance` (numeric, same shape as
   `wallet.balance`), `color`, `icon`, `statementCloseDay`, `dueDay`, timestamps —
   indexed on `userId`.
2. Alter `transaction`: drop `NOT NULL` on `wallet_id`, add nullable `card_id` (FK,
   cascade) + nullable `status` enum, add the exactly-one-destination check
   constraint. Both are additive/relaxing for existing rows — no backfill needed,
   every existing row already has `wallet_id` set and satisfies the constraint.
3. Generate via `drizzle-kit generate`, review the SQL, apply locally.
4. No rollback complexity beyond the standard down-migration — no data is
   transformed, only the shape is relaxed/extended.

## Open Questions

- Shortcut key `c` for card charges — confirm it doesn't collide with any
  browser/OS-reserved combination in the app's actual keyboard-shortcut hook before
  implementation (the transactions shortcut `n` was presumably already checked the
  same way).
