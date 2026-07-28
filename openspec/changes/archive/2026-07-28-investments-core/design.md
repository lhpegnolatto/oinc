## Context

Wallets and credit cards each have a `balance` that only moves as a documented side
effect of a transaction/payment (`wallets/spec.md`: *"balance only moves as a side
effect of a transaction against the wallet... it is never directly editable"*).
Investments have no equivalent ledger to derive a value from — there's no live market
feed and no tax-lot tracking (see `.docs/product/overview.md` non-goals) — so a
holding's value has to be a number the user types in by hand, the same way they'd
glance at a brokerage app and note what it says today.

The nearest existing pattern is `credit_card_payment`: a cross-domain money movement
that got its own table rather than being shoehorned into `transaction`. Investments
don't need that pattern at all here — this change deliberately keeps the module fully
isolated from `wallets`/`transactions`, see Decision 1.

## Goals / Non-Goals

**Goals:**
- A signed-in user can create/list/update/delete an investment holding they own:
  name, appearance (color/icon), optional `quantity`, optional `costBasis`, required
  `currentValue`.
- `currentValue` is edited in place, like a wallet's `name`/`color` — no history is
  kept.
- When `costBasis` is present, show an unrealized gain/loss (`currentValue −
  costBasis`) alongside the holding.
- `/investments` page, structurally identical to `/wallets`: list + total + create/edit
  dialog + delete confirmation.

**Non-Goals:**
- Any interaction with `wallets`/`transactions` — no wallet is debited/credited when a
  holding is created, valued, or deleted. If a user wants the cash side reflected,
  they log an ordinary expense transaction themselves (existing capability, untouched
  by this change).
- Valuation history / a trend line over time — `currentValue` is a snapshot, not a
  ledger. If `net-worth-aggregation` later needs investment history, that's a
  decision for that change to make, with its own actual requirement in hand.
- Live/fetched pricing of any kind (no ticker lookups, no market data APIs).
- Per-unit price as a stored field — `costBasis` and `currentValue` are both total
  dollar amounts, not `quantity × price`. `quantity` is informational only and never
  feeds a calculation in this change.
- Cross-field validation between `quantity` and `costBasis` (e.g. requiring both or
  neither) — a user can fill in any subset.
- Dashboard/net-worth rollup — reserved for `net-worth-aggregation`.
- A keyboard shortcut for create/update — see Decision 4.

## Decisions

### 1. `investments` module has zero coupling to `wallets`/`transactions`

No FK from `investment` to `wallet`, no controller-level orchestration calling into
another module's commands. This is a deliberate simplification relative to
`credit_card_payment`'s cross-domain-transfer pattern, not an oversight: that pattern
exists because paying a card is inherently bidirectional bookkeeping between two of
the user's own tracked balances. Buying/selling an investment isn't modeled as a
transfer here at all — `currentValue` is a fact the user reports, not a balance this
app computes from money movement it witnessed. If a user wants their wallet to show
the cash leaving, logging a normal expense transaction already does that, with no new
code.

**Alternative considered**: mirror `credit_card_payment` — a `investment_purchase`
table that decrements a wallet on buy. Rejected: unlike a card payment (always
decreases what's owed, one direction), an investment purchase/sale is bidirectional
(buy decreases the wallet, sell increases it), which is new surface area the existing
precedent doesn't cover, and the roadmap's own description ("manual holdings + manual
valuation updates") doesn't call for it. Revisit only if a concrete "one-step buy"
user story shows up later.

### 2. Schema: one `investment` table, values stored as totals not per-unit

```ts
// shared/db/schema/investments-schema.ts
export const investment = pgTable(
  "investment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8, mode: "number" }), // nullable
    costBasis: numeric("cost_basis", { precision: 14, scale: 2, mode: "number" }), // nullable
    currentValue: numeric("current_value", {
      precision: 14,
      scale: 2,
      mode: "number",
    }).notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("investment_userId_idx").on(table.userId)],
);
```

`quantity` gets `precision: 20, scale: 8` (not the `14,2` used for money elsewhere in
the schema) to hold fractional crypto/share amounts without truncation; it's the only
non-money numeric field in the schema so this precedent doesn't need to spread
anywhere else.

### 3. Appearance reuses `wallet`'s icon set, not a new curated list

`shared/validation/wallet-appearance.ts`'s `WALLET_ICON_KEYS` already includes
investment-flavored icons (`trending-up`, `chart-line`, `bitcoin`, `gem`, `landmark`,
`coins`). `investment-appearance.ts` re-exports the same `WALLET_ICON_KEYS` /
`colorSchema` rather than curating a second list — the exact move `credit-cards` made
for the same reason (`credit-cards-core/design.md` Decision 5): no
domain-specific icon vocabulary needed, and one curated list is easier to keep
sensible than two that drift.

### 4. No keyboard shortcut for create/update — dialog only, same as wallets

Per the product doc, only *frequent* actions need a shortcut + sheet. Logging a
transaction is high-frequency; declaring a holding or nudging its value is not (a
user might touch this a few times a month, checking their brokerage app). This
mirrors wallet creation exactly: a `Dialog` reachable from `/investments`, no global
shortcut. Called out explicitly here per the product doc's requirement to state a
"no shortcut yet" decision rather than silently skip it.

### 5. Gain/loss is computed at the query/response layer, never stored

`currentValue − costBasis`, computed in the query that shapes the list/detail
response, shown only when `costBasis` is non-null. Not persisted as a column — it's
fully derived from two already-stored numbers, so storing it would just be a
denormalization with no read-performance justification (unlike, say, `wallet.balance`,
which is denormalized specifically to avoid re-summing transactions on every read).

### 6. `updatedAt` is surfaced in the UI as "last updated"

Since nothing forces a user to keep `currentValue` fresh, `/investments` shows each
holding's `updatedAt` (e.g. "updated 3 weeks ago") so staleness is visible at a
glance without building any reminder/notification system — a cheap signal, not a new
feature.

## Risks / Trade-offs

- **[Trade-off]** A holding's `currentValue` can go stale indefinitely with no
  enforcement. → **Mitigation**: Decision 6 (visible "last updated") makes staleness
  legible; a reminder system is explicitly out of scope until there's evidence users
  actually forget.
- **[Trade-off]** Because this change doesn't touch net worth, a user who logs both an
  investment holding and a separate expense transaction for the same purchase will
  see both amounts reflected once `net-worth-aggregation` ships (cash down via the
  transaction, investment value up via the holding) — which is the intended,
  accurate picture, not double-counting. → **Mitigation**: none needed, but worth
  restating in `net-worth-aggregation`'s own proposal so it isn't mistaken for a bug
  during that change's design.
- **[Risk]** `quantity`'s `20,8` precision is a new shape in a schema where every
  other numeric column is `14,2` money. → **Mitigation**: documented inline in the
  schema (Decision 2) so a future reader doesn't assume it's a typo or try to
  normalize it to match.

## Migration Plan

1. Add `investment` table (`shared/db/schema/investments-schema.ts`) as in Decision
   2, indexed on `userId`. No changes to any existing table — purely additive.
2. Generate via `drizzle-kit generate`, review the SQL, apply locally.
3. No backfill, no rollback complexity — a brand new, standalone table.
